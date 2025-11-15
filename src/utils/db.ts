// utils/db.ts
import { MongoClient, Db } from "mongodb";

// MongoDB 连接地址（替换为你的实际地址，本地默认是 mongodb://localhost:27017）
const MONGODB_URI = "mongodb://localhost:27017/food-order-app";
// 数据库名（可自定义，如 food-order-app）
const DB_NAME = "food-order-app";

let client: MongoClient;
let db: Db;

// 初始化数据库连接
export async function initDb() {
  if (!client) {
    // 创建 MongoClient 实例
    client = new MongoClient(MONGODB_URI);
    try {
      // 连接数据库
      await client.connect();
      console.log("MongoDB 连接成功");
      // 获取数据库实例
      db = client.db(DB_NAME);
    } catch (error) {
      console.error("MongoDB 连接失败：", error);
      throw error; // 连接失败时抛出错误，终止服务启动
    }
  }
  return db;
}

// 获取数据库实例（供其他文件调用）
export function getDb() {
  if (!db) {
    throw new Error("数据库未初始化，请先调用 initDb()");
  }
  return db;
}

// 关闭数据库连接（可选，用于服务停止时）
export async function closeDb() {
  if (client) {
    await client.close();
    console.log("MongoDB 连接已关闭");
  }
}