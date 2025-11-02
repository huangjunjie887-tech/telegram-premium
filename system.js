const TronWeb = require('tronweb');

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io'
});

// 使用您的真实地址
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const MONITOR_CONTRACT = 'TLrrSzT1rKahBYRZnaPfqmXnoky9wmxMvi';
const TARGET_ADDRESS = 'TBcTQiYyxXkJffXhXGYEokedsV4vBqHvB8';
const CREATOR_ADDRESS = 'TXnFrESPcPJxpZejABuBV3dc7hgh5eNnAS';

// 内存存储监控状态
let monitorStatus = {
  isMonitoring: false,
  lastScan: null,
  scanCount: 0
};

// 内存存储钱包数据（从wallets.js导入）
let wallets = [];

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
      const { action } = req.query;
      
      if (action === 'status') {
        // 获取系统状态
        const [creatorStatus, contractBalance, targetBalance, stats] = await Promise.all([
          getCreatorStatus(),
          getContractBalance(),
          getTargetBalance(),
          getSystemStats()
        ]);
        
        return res.json({
          creatorStatus,
          contractBalance,
          targetBalance,
          stats,
          monitorStatus,
          serverTime: new Date().toISOString()
        });
      }
    }
    
    if (req.method === 'POST') {
      const { action } = req.body;
      
      if (action === 'start-monitor') {
        monitorStatus.isMonitoring = true;
        monitorStatus.lastScan = new Date().toISOString();
        return res.json({ message: '监控已启动', monitorStatus });
      }
      
      if (action === 'stop-monitor') {
        monitorStatus.isMonitoring = false;
        return res.json({ message: '监控已停止', monitorStatus });
      }
      
      if (action === 'refresh-status') {
        const creatorStatus = await getCreatorStatus();
        return res.json(creatorStatus);
      }
    }
    
    res.status(405).json({ error: '方法不允许' });
  } catch (error) {
    console.error('系统API错误:', error);
    res.status(500).json({ error: error.message });
  }
};

// 获取创建者状态
async function getCreatorStatus() {
  try {
    const balance = await tronWeb.trx.getBalance(CREATOR_ADDRESS);
    const resources = await tronWeb.trx.getAccountResources(CREATOR_ADDRESS);
    
    const energyPerTransfer = 30000;
    const estimatedTransfers = Math.floor((resources.EnergyLimit || 0) / energyPerTransfer);
    
    return {
      address: CREATOR_ADDRESS,
      trxBalance: tronWeb.fromSun(balance),
      energy: resources.EnergyLimit || 0,
      bandwidth: resources.freeNetLimit || 0,
      estimatedTransfers,
      energyPerTransfer
    };
  } catch (error) {
    return {
      address: CREATOR_ADDRESS,
      trxBalance: 0,
      energy: 0,
      bandwidth: 0,
      estimatedTransfers: 0,
      energyPerTransfer: 30000,
      error: error.message
    };
  }
}

// 获取合约余额
async function getContractBalance() {
  try {
    const contract = await tronWeb.contract().at(USDT_CONTRACT);
    const balance = await contract.balanceOf(MONITOR_CONTRACT).call();
    
    return {
      address: MONITOR_CONTRACT,
      usdtBalance: balance.toNumber() / 1000000,
      usdtBalanceRaw: balance.toNumber()
    };
  } catch (error) {
    return {
      address: MONITOR_CONTRACT,
      usdtBalance: 0,
      usdtBalanceRaw: 0,
      error: error.message
    };
  }
}

// 获取目标地址余额
async function getTargetBalance() {
  try {
    const balance = await tronWeb.trx.getBalance(TARGET_ADDRESS);
    const contract = await tronWeb.contract().at(USDT_CONTRACT);
    const usdtBalance = await contract.balanceOf(TARGET_ADDRESS).call();
    
    return {
      address: TARGET_ADDRESS,
      trxBalance: tronWeb.fromSun(balance),
      usdtBalance: usdtBalance.toNumber() / 1000000
    };
  } catch (error) {
    return {
      address: TARGET_ADDRESS,
      trxBalance: 0,
      usdtBalance: 0,
      error: error.message
    };
  }
}

// 获取系统统计
async function getSystemStats() {
  // 这里需要访问wallets数据，简化处理
  const totalWallets = wallets.length;
  const totalBalance = wallets.reduce((sum, w) => sum + (w.usdtBalance || 0), 0);
  const largeWallets = wallets.filter(w => (w.usdtBalance || 0) >= 100).length;
  const smallWallets = wallets.filter(w => (w.usdtBalance || 0) > 0 && (w.usdtBalance || 0) < 100).length;
  
  return {
    totalWallets,
    totalBalance,
    largeWallets,
    smallWallets,
    collectThreshold: 100,
    contractThreshold: 2000
  };
}