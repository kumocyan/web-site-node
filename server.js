const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const methodOverride = require('method-override');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcrypt');
const ejs = require('ejs');
const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = process.env.PORT || 3000;

// セッション設定
app.use(session({
  secret: 'supersecretkey', // 任意の秘密鍵を設定
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // 本番環境ではtrueに設定
}));

// SQLiteデータベース接続
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
  } else {
    console.log('✅ SQLiteデータベースに接続しました');
    initDatabase();
  }
});

// データベース初期化関数
function initDatabase() {
  db.serialize(() => {
    const carsTableSql = `
      CREATE TABLE IF NOT EXISTS cars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        model TEXT,
        year INTEGER,
        price INTEGER,
        mileage INTEGER DEFAULT 0,
        color TEXT,
        fuel_type TEXT,
        transmission TEXT,
        status TEXT DEFAULT 'available',
        description TEXT,
        image_path TEXT,
        features TEXT,
        store_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.run(carsTableSql, (err) => {
      if (err) {
        console.error('carsテーブル作成エラー:', err.message);
      } else {
        console.log('✅ carsテーブルが作成されました');
        db.run("ALTER TABLE cars ADD COLUMN store_name TEXT", (alterErr) => {
          if (alterErr && !alterErr.message.includes('duplicate column name')) {
            console.error('カラム追加エラー:', alterErr.message);
          } else if (!alterErr) {
            console.log('✅ store_nameカラムが追加されました');
          }
        });
      }
    });

    const usersTableSql = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.run(usersTableSql, (err) => {
      if (err) {
        console.error('usersテーブル作成エラー:', err.message);
      } else {
        console.log('✅ usersテーブルが作成されました');
        seedUsers();
      }
    });

    const announcementsTableSql = `
      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        icon_class TEXT DEFAULT 'fas fa-info-circle',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.run(announcementsTableSql, (err) => {
      if (err) {
        console.error('announcementsテーブル作成エラー:', err.message);
      } else {
        console.log('✅ announcementsテーブルが作成されました');
        // カラム追加（存在しない場合のみ）
        db.run("ALTER TABLE announcements ADD COLUMN icon_class TEXT DEFAULT 'fas fa-info-circle'", (alterErr) => {
          if (alterErr && !alterErr.message.includes('duplicate column name')) {
            console.error('icon_classカラム追加エラー:', alterErr.message);
          } else if (!alterErr) {
            console.log('✅ icon_classカラムが追加されました');
          }
        });
      }
    });
  });
}

// データベースに初期ユーザーを登録（マイグレーション）
function seedUsers() {
  const usersToSeed = [
    { username: 'nstyle2025', password: 'password' }
  ];

  // 古い 'admin' ユーザーを削除
  db.run(`DELETE FROM users WHERE username = ?`, ['admin'], function(err) {
    if (err) {
      return console.error('adminユーザー削除エラー:', err.message);
    }
    if (this.changes > 0) {
      console.log('✅ 古い管理者ユーザー (admin) を削除しました');
    }
  });

  // シードするユーザーをループ処理
  usersToSeed.forEach(userData => {
    // ユーザーが存在しない場合のみ追加
    db.get(`SELECT * FROM users WHERE username = ?`, [userData.username], async (err, row) => {
      if (err) {
        return console.error(`ユーザー確認エラー (${userData.username}):`, err.message);
      }
      if (!row) {
        try {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [userData.username, hashedPassword], (insertErr) => {
            if (insertErr) {
              console.error(`ユーザー作成エラー (${userData.username}):`, insertErr.message);
            } else {
              console.log(`✅ ユーザー (${userData.username}) を作成しました`);
            }
          });
        } catch (hashErr) {
          console.error('パスワードハッシュ化エラー:', hashErr);
        }
      }
    });
  });
}

// Promiseベースのデータベース操作関数
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// ビューエンジン設定
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout'); // デフォルトレイアウト
app.set('views', path.join(__dirname, 'views'));

// ファイルアップロード設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'assets', 'gallery'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'car-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロード可能です'), false);
    }
  }
});

// ミドルウェア
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// 認証チェックミドルウェア
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.redirect('/admin/login');
}

// ミドルウェアを設定し、/admin ルートに admin/layout を適用
app.use('/admin', (req, res, next) => {
  if (req.originalUrl.startsWith('/admin') && !req.originalUrl.startsWith('/admin/login')) {
      res.locals.layout = 'admin/layout';
  }
  next();
});


// ルート設定
app.get('/', async (req, res) => {
  try {
    const announcements = await dbAll('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 3');
    let recentCars = await dbAll('SELECT * FROM cars WHERE status = "available" ORDER BY created_at DESC LIMIT 3');

    // データ整形: mileage と price を数値として保証する
    recentCars = recentCars.map(car => ({
      ...car,
      mileage: Number(car.mileage) || 0,
      price: Number(car.price) || 0,
    }));

    res.render('index', {
      title: 'N-STYLE - 中古車販売',
      description: '石狩市で創業20年、地域のお客様に寄り添った中古車販売サービスを提供',
      catchphrase: '安心・安全・最安値',
      announcements: announcements,
      cars: recentCars
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: 'トップページの読み込みに失敗しました'
    });
  }
});

// 管理者ログインページ
app.get('/admin/login', (req, res) => {
  res.render('admin/login', { 
    title: '管理者ログイン', 
    description: 'N-STYLE 管理画面へのログインページです。',
    message: req.session.message 
  });
  req.session.message = null; // メッセージをクリア
});

// 管理者ログイン処理
app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.isAuthenticated = true;
      res.redirect('/admin');
    } else {
      req.session.message = 'ユーザー名またはパスワードが正しくありません';
      res.redirect('/admin/login');
    }
  } catch (error) {
    console.error('ログイン処理エラー:', error);
    req.session.message = 'サーバーエラーが発生しました';
    res.redirect('/admin/login');
  }
});

// ログアウト処理
app.get('/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('セッション破棄エラー:', err);
      return res.status(500).send('ログアウトに失敗しました');
    }
    res.redirect('/admin/login');
  });
});

// ===================================
// アカウント管理
// ===================================

// アカウント管理ページ表示
app.get('/admin/users', isAuthenticated, async (req, res) => {
  try {
    const users = await dbAll('SELECT id, username, created_at FROM users ORDER BY created_at DESC');
    res.render('admin/users', {
      title: 'アカウント管理',
      description: 'ユーザーアカウントの追加・削除を行います',
      users: users
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: 'アカウント情報の取得に失敗しました'
    });
  }
});

// 新規アカウント追加
app.post('/admin/users', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    // 本来はエラーメッセージを画面に表示するべき
    return res.status(400).send('ユーザー名とパスワードは必須です');
  }

  try {
    const existingUser = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(409).send('このユーザー名は既に使用されています');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await dbRun('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: 'アカウントの追加に失敗しました'
    });
  }
});

// アカウント削除
app.delete('/admin/users/:id', async (req, res) => {
  try {
    const userToDelete = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (userToDelete && userToDelete.username === 'nstyle2025') {
      return res.status(403).send('メイン管理者は削除できません');
    }

    await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: 'アカウントの削除に失敗しました'
    });
  }
});

// ===================================
// お知らせ管理
// ===================================

// お知らせ管理ページ表示
app.get('/admin/announcements', isAuthenticated, async (req, res) => {
  try {
    const announcements = await dbAll('SELECT * FROM announcements ORDER BY created_at DESC');
    res.render('admin/announcements', {
      title: 'お知らせ管理',
      description: 'トップページのお知らせを追加・削除します',
      announcements: announcements
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: 'お知らせ情報の取得に失敗しました'
    });
  }
});

// 新規お知らせ追加
app.post('/admin/announcements', isAuthenticated, async (req, res) => {
  const { title, content, icon_class } = req.body;
  if (!title || !content) {
    return res.status(400).send('タイトルと内容は必須です');
  }

  try {
    await dbRun('INSERT INTO announcements (title, content, icon_class) VALUES (?, ?, ?)', [title, content, icon_class || 'fas fa-info-circle']);
    res.redirect('/admin/announcements');
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: 'お知らせの追加に失敗しました'
    });
  }
});

// お知らせ編集ページ表示
app.get('/admin/announcements/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const announcement = await dbGet('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    if (announcement) {
      res.render('admin/announcements/edit', {
        title: 'お知らせ編集',
        description: 'お知らせの内容を編集します',
        announcement: announcement
      });
    } else {
      res.status(404).render('404', {
        title: 'お知らせが見つかりません',
        description: '指定されたお知らせは見つかりませんでした。'
      });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: 'お知らせ情報の取得に失敗しました'
    });
  }
});

// お知らせ更新
app.put('/admin/announcements/:id', isAuthenticated, async (req, res) => {
  const { title, content, icon_class } = req.body;
  if (!title || !content) {
    return res.status(400).send('タイトルと内容は必須です');
  }

  try {
    await dbRun(
      'UPDATE announcements SET title = ?, content = ?, icon_class = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, content, icon_class || 'fas fa-info-circle', req.params.id]
    );
    res.redirect('/admin/announcements');
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: 'お知らせの更新に失敗しました'
    });
  }
});

// お知らせ削除
app.delete('/admin/announcements/:id', isAuthenticated, async (req, res) => {
  try {
    await dbRun('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.redirect('/admin/announcements');
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: 'お知らせの削除に失敗しました'
    });
  }
});

// ===================================
// APIエンドポイント
// ===================================

// お知らせ取得API
app.get('/api/announcements', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 3;
    const announcements = await dbAll('SELECT * FROM announcements ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
    res.json(announcements);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});


// 在庫一覧
app.get('/inventory', async (req, res) => {
  try {
    let sql = 'SELECT * FROM cars WHERE status = "available"';
    const params = [];
    const whereClauses = [];

    const { price, fuel_type, transmission, mileage } = req.query;

    if (price) {
      if (price === '100') {
        whereClauses.push('price <= ?');
        params.push(100);
      } else if (price === '200') {
        whereClauses.push('price > ? AND price <= ?');
        params.push(100, 200);
      } else if (price === '300') {
        whereClauses.push('price > ? AND price <= ?');
        params.push(200, 300);
      } else if (price === '301') {
        whereClauses.push('price > ?');
        params.push(300);
      }
    }
    if (fuel_type) {
      whereClauses.push('fuel_type = ?');
      params.push(fuel_type);
    }
    if (transmission) {
      whereClauses.push('transmission = ?');
      params.push(transmission);
    }
    if (mileage) {
      whereClauses.push('mileage <= ?');
      params.push(parseInt(mileage, 10) * 10000);
    }

    if (whereClauses.length > 0) {
      sql += ' AND ' + whereClauses.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC';

    const cars = await dbAll(sql, params);

    // featuresをJSONパース
    cars.forEach(car => {
      if (car.features) {
        try {
          car.features = JSON.parse(car.features);
        } catch (e) {
          car.features = [];
        }
      } else {
        car.features = [];
      }
    });

    res.render('inventory/index', {
      title: '在庫情報',
      description: 'N-STYLEの中古車在庫一覧。豊富なラインナップからあなたにぴったりの一台をお選びください',
      cars: cars || [],
      query: req.query
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: '在庫情報の取得に失敗しました'
    });
  }
});

// 在庫詳細
app.get('/inventory/:id', async (req, res) => {
  try {
    const car = await dbGet('SELECT * FROM cars WHERE id = ? AND status = "available"', [req.params.id]);

    if (!car) {
      return res.status(404).render('404', { 
        title: '車両が見つかりません',
        description: 'お探しの車両は見つかりませんでした。'
       });
    }

    // featuresをJSONパース
    if (car.features) {
      try {
        car.features = JSON.parse(car.features);
      } catch (e) {
        car.features = [];
      }
    } else {
      car.features = [];
    }

    res.render('inventory/show', {
      title: `${car.name} - 在庫情報`,
      description: `${car.name}の詳細情報ページです。`,
      car: car
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: '車両情報の取得に失敗しました'
    });
  }
});

// 会社概要
app.get('/about', (req, res) => {
  res.render('about', {
    title: '会社概要',
    description: 'N-STYLEの会社概要。石狩市で創業20年、地域のお客様に信頼される中古車販売店です。'
  });
});

// お問い合わせ
app.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'お問い合わせ',
    description: 'N-STYLEへのお問い合わせはこちらから。ご質問・ご相談などお気軽にご連絡ください。'
  });
});

// アクセス
app.get('/access', (req, res) => {
  res.render('access', {
    title: 'アクセス',
    description: 'N-STYLEへのアクセス方法。店舗所在地、地図、交通手段をご案内いたします。'
  });
});

// 管理画面 - 在庫管理
app.get('/admin', isAuthenticated, async (req, res) => {
  try {
    const cars = await dbAll('SELECT * FROM cars ORDER BY created_at DESC');

    res.render('admin/index', {
      title: '在庫管理',
      description: 'N-STYLE 車両在庫管理システム',
      cars: cars || []
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: '管理画面の読み込みに失敗しました'
    });
  }
});

// 新規車両追加フォーム表示
app.get('/admin/new', isAuthenticated, (req, res) => {
  res.render('admin/new', {
    title: '新規車両追加',
    description: '新しい車両情報を登録します'
  });
});

// 新規車両データ保存
app.post('/admin', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { name, model, year, price, mileage, color, fuel_type, transmission, status, description, features, store_name } = req.body;

    // 特徴をJSON形式に変換
    let featuresJson = null;
    if (features) {
      const featuresArray = features.split('\n').map(f => f.trim()).filter(f => f.length > 0);
      featuresJson = JSON.stringify(featuresArray);
    }

    // 画像パス設定
    let imagePath = null;
    if (req.file) {
      imagePath = '/gallery/' + req.file.filename;
    }

    const sql = `
      INSERT INTO cars (name, model, year, price, mileage, color, fuel_type, transmission, status, description, features, image_path, store_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbRun(sql, [name, model, year, price, mileage || 0, color, fuel_type, transmission, status || 'available', description, featuresJson, imagePath, store_name]);

    res.redirect('/admin');
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: '車両の追加に失敗しました'
    });
  }
});

// 車両編集フォーム表示
app.get('/admin/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const car = await dbGet('SELECT * FROM cars WHERE id = ?', [req.params.id]);

    if (!car) {
      return res.status(404).render('404', { 
        title: '車両が見つかりません',
        description: 'お探しの車両は見つかりませんでした。'
      });
    }

    res.render('admin/edit', {
      title: '車両編集',
      description: '車両情報を編集します',
      car: car
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: '車両情報の取得に失敗しました'
    });
  }
});

// 車両データ更新
app.put('/admin/:id', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { name, model, year, price, mileage, color, fuel_type, transmission, status, description, features, store_name } = req.body;

    // 特徴をJSON形式に変換
    let featuresJson = null;
    if (features) {
      const featuresArray = features.split('\n').map(f => f.trim()).filter(f => f.length > 0);
      featuresJson = JSON.stringify(featuresArray);
    }

    // 現在の車両情報を取得
    const currentCar = await dbGet('SELECT * FROM cars WHERE id = ?', [req.params.id]);
    if (!currentCar) {
      return res.status(404).render('404', { 
        title: '車両が見つかりません',
        description: 'お探しの車両は見つかりませんでした。'
       });
    }

    // 画像パス設定（新しい画像があれば更新）
    let imagePath = currentCar.image_path;
    if (req.file) {
      imagePath = '/gallery/' + req.file.filename;
    }

    const sql = `
      UPDATE cars
      SET name = ?, model = ?, year = ?, price = ?, mileage = ?, color = ?, fuel_type = ?, transmission = ?, status = ?, description = ?, features = ?, image_path = ?, store_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await dbRun(sql, [name, model, year, price, mileage || 0, color, fuel_type, transmission, status, description, featuresJson, imagePath, store_name, req.params.id]);

    res.redirect('/admin');
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: '車両の更新に失敗しました'
    });
  }
});

// 車両データ削除
app.delete('/admin/:id', isAuthenticated, async (req, res) => {
  try {
    const car = await dbGet('SELECT * FROM cars WHERE id = ?', [req.params.id]);

    if (!car) {
      return res.status(404).render('404', { 
        title: '車両が見つかりません',
        description: 'お探しの車両は見つかりませんでした。'
       });
    }

    await dbRun('DELETE FROM cars WHERE id = ?', [req.params.id]);

    res.redirect('/admin');
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', {
      title: 'エラー',
      description: 'システムエラーが発生しました',
      message: '車両の削除に失敗しました'
    });
  }
});

// 404エラーハンドリング
app.use((req, res) => {
  res.status(404).render('404', { 
    title: 'ページが見つかりません',
    description: 'お探しのページは見つかりませんでした。'
   });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'サーバーエラー',
    description: 'サーバーで予期せぬエラーが発生しました。',
    message: 'しばらくしてからもう一度お試しください。'
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚗 N-STYLE ウェブサイトがポート ${PORT} で起動しました！`);
  console.log(`http://localhost:${PORT}`);
});
