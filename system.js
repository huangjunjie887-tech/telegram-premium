// 获取系统统计
async function getSystemStats() {
  const wallets = global.walletsData || [];
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