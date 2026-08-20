const { Pool, types } = require('pg');

// DATE(oid 1082) 컬럼을 JS Date로 변환하면 로컬 타임존 기준 자정이 UTC 직렬화 시 하루 밀리는 문제가 생긴다.
// apply_start_at/apply_end_at/event_date는 시간 없는 순수 날짜이므로 원본 문자열('YYYY-MM-DD')을 그대로 사용한다.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

module.exports = pool;
