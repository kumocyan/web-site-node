-- N-STYLE 車在庫管理データベース初期化スクリプト

-- データベース作成（存在しない場合）
CREATE DATABASE IF NOT EXISTS car_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- データベース使用
USE car_shop;

-- 在庫テーブル作成
CREATE TABLE IF NOT EXISTS cars (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '車種名',
  model VARCHAR(255) COMMENT 'モデル',
  year INT COMMENT '年式',
  price INT COMMENT '価格（円）',
  mileage INT COMMENT '走行距離（km）',
  color VARCHAR(50) COMMENT '色',
  fuel_type VARCHAR(50) COMMENT '燃料種類',
  transmission VARCHAR(50) COMMENT '変速機',
  status ENUM('available', 'sold', 'reserved') DEFAULT 'available' COMMENT '在庫状況',
  description TEXT COMMENT '説明',
  image_path VARCHAR(500) COMMENT '画像パス',
  features JSON COMMENT '特徴（JSON形式）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ユーザー管理テーブル
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- サンプルデータ挿入
INSERT INTO cars (name, model, year, price, mileage, color, fuel_type, transmission, status, description, features) VALUES
('トヨタ プリウス', 'Prius S', 2022, 2850000, 15000, 'シルバー', 'ハイブリッド', 'CVT', 'available',
'低燃費で経済的なハイブリッド車。ナビゲーション、バックカメラ、ETC標準装備。', '["ナビゲーション", "バックカメラ", "ETC", "エアコン"]'),

('ホンダ フィット', 'Fit G・Honda SENSING', 2023, 1698000, 5000, 'ホワイト', 'ガソリン', 'CVT', 'available',
'広い室内空間と優れた燃費性能を兼ね備えたコンパクトカー。安全運転支援システムHonda SENSING標準装備。', '["Honda SENSING", "アイドリングストップ", "7インチディスプレイ"]'),

('日産 ノート', 'Note X DIG-S', 2023, 1980000, 8000, 'ブラック', 'ガソリン', 'CVT', 'available',
'e-POWERモデルの上位グレード。モーター駆動による滑らかな走りと低燃費を実現。', '["e-POWER", "プロパイロット", "全方位モニター"]'),

('スズキ スペーシア', 'Spacia G', 2023, 1380000, 3000, 'ピンク', 'ガソリン', 'CVT', 'available',
'軽自動車トップクラスの広さを誇るスーパーハイトワゴン。家族でのお出かけに最適。', '["衝突被害軽減ブレーキ", "誤発進抑制機能", "全方位モニター"]'),

('ダイハツ タント', 'Tanto L', 2022, 1250000, 12000, 'ブルー', 'ガソリン', 'CVT', 'available',
'軽トールワゴンの元祖。広い室内空間と使い勝手の良さが魅力。', '["スライドドア", "衝突回避支援システム", "全方位カメラ"]'),

('トヨタ ヤリス', 'Yaris G', 2023, 1580000, 6000, 'レッド', 'ガソリン', 'CVT', 'available',
'コンパクトカーながら広々とした室内空間。安全装備も充実。', '["Toyota Safety Sense", "7インチディスプレイ", "Apple CarPlay対応"]'),

('ホンダ N-BOX', 'N-BOX G・Honda SENSING', 2023, 1598000, 4000, 'ホワイト', 'ガソリン', 'CVT', 'available',
'軽自動車販売台数No.1の人気モデル。圧倒的な室内空間と使い勝手の良さ。', '["Honda SENSING", "大開口スライドドア", "大容量ラゲッジ"]'),

('日産 ルークス', 'Roox S', 2022, 1420000, 9000, 'シルバー', 'ガソリン', 'CVT', 'available',
'軽自動車初のハイトワゴン。広い室内空間と優れた積載能力。', '["全方位モニター", "インテリジェントアラウンドビューモニター", "プロパイロット"]'),

('スズキ ハスラー', 'Hustler G', 2023, 1360000, 2000, 'オレンジ', 'ガソリン', 'CVT', 'available',
'SUVテイストの軽自動車。遊び心のあるデザインと悪路走破性。', '["四輪駆動", "衝突被害軽減ブレーキ", "全方位モニター"]'),

('三菱 デリカミニ', 'Delica Mini D', 2023, 2180000, 1000, 'ブラック', 'ガソリン', 'CVT', 'available',
'デリカのDNAを受け継ぐコンパクトサイズのSUV。優れた走破性と広い室内空間。', '["四輪駆動", "全方位モニター", "大径タイヤ"]')

ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  model = VALUES(model),
  year = VALUES(year),
  price = VALUES(price),
  mileage = VALUES(mileage),
  color = VALUES(color),
  fuel_type = VALUES(fuel_type),
  transmission = VALUES(transmission),
  status = VALUES(status),
  description = VALUES(description),
  features = VALUES(features),
  updated_at = CURRENT_TIMESTAMP;

-- 完了メッセージ
SELECT 'N-STYLE データベース初期化完了' as message;
