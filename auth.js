const jwt = require('jsonwebtoken');

// 简单的用户存储（生产环境应该用数据库）
const users = {
  'admin': { password: 'admin123', name: '管理员', role: 'admin' }
};

module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { username, password } = req.body;
    
    if (users[username] && users[username].password === password) {
      const token = jwt.sign(
        { username, role: users[username].role },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '24h' }
      );
      
      return res.json({ 
        token, 
        user: { 
          username, 
          name: users[username].name, 
          role: users[username].role 
        } 
      });
    }
    
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  res.status(405).json({ error: '方法不允许' });
};