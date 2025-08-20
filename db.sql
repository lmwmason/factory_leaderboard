CREATE DATABASE IF NOT EXISTS leaderboard_db;
USE leaderboard_db;

CREATE TABLE IF NOT EXISTS leaderboard (
  id VARCHAR(50) PRIMARY KEY,
  score INT NOT NULL
);
