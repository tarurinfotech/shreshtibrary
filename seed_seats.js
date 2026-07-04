/* eslint-disable */
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:shreshtlibrary@db.crrfhaaqeainuqzkmged.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  console.log('Connected to db');

  // Let's first clear existing seats from floor 1 or all seats if we want to reset
  const floorRes = await client.query(`SELECT id FROM seats_floor WHERE name = 'Floor 1'`);
  let floorId;
  if (floorRes.rows.length === 0) {
    const newFloor = await client.query(`INSERT INTO seats_floor (name, "order", is_active, description) VALUES ('Floor 1', 1, true, '') RETURNING id`);
    floorId = newFloor.rows[0].id;
  } else {
    floorId = floorRes.rows[0].id;
    console.log('Clearing old seats for Floor 1');
    await client.query(`DELETE FROM seats_seat WHERE row_ref_id IN (SELECT id FROM seats_seatrow WHERE floor_id = $1)`, [floorId]);
    await client.query(`DELETE FROM seats_seatrow WHERE floor_id = $1`, [floorId]);
  }

  // 8 rows.
  // We'll create rows 1 to 8.
  const seatsData = [
    { label: '1', count: 7, start: 1, end: 7 },
    { label: '2', count: 6, start: 8, end: 13 },
    { label: '3', count: 6, start: 14, end: 19 },
    { label: '4', count: 6, start: 20, end: 25 },
    { label: '5', count: 6, start: 26, end: 31 },
    { label: '6', count: 6, start: 32, end: 37 },
    { label: '7', count: 6, start: 38, end: 43 },
    { label: '8', count: 7, start: 44, end: 50 },
  ];

  for (let i = 0; i < seatsData.length; i++) {
    const d = seatsData[i];
    const rowRes = await client.query(`INSERT INTO seats_seatrow (label, "order", floor_id) VALUES ($1, $2, $3) RETURNING id`, [d.label, i+1, floorId]);
    const rowId = rowRes.rows[0].id;
    for (let s = d.start; s <= d.end; s++) {
      // Create seat
      await client.query(`INSERT INTO seats_seat (seat_number, status, is_reserved_for_girls, floor, row, row_ref_id) VALUES ($1, 'AVAILABLE', false, 'Floor 1', $2, $3)`, [s.toString(), d.label, rowId]);
    }
  }

  console.log('Inserted 50 seats');
  await client.end();
}

run().catch(console.error);
