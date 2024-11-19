const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function seedDb() {
  try {
    const db = await open({
      filename: path.join(process.cwd(), 'db/database.sqlite'),
      driver: sqlite3.Database
    });

    // Clean existing data
    await db.run('DELETE FROM projects');
    await db.run('DELETE FROM mevent_unions');
    await db.run('DELETE FROM mevents');
    await db.run('DELETE FROM item_positions');
    await db.run('DELETE FROM caspar_clips');
    await db.run('DELETE FROM casparcg_servers');
    await db.run('DELETE FROM caspar_channels');

    // Reset autoincrement
    await db.run('DELETE FROM sqlite_sequence');

    // Insert CasparCG server
    await db.run(`
      INSERT INTO casparcg_servers (
        name, host, port, description, username, password,
        preview_channel, locked_channel, is_shadow, enabled
      ) VALUES (
        'LENOVO', '192.168.0.194', 5250, 'Local development server',
        NULL, NULL, 2, 1, 0, 1
      )
    `);

    // Insert one project
    await db.run(`
      INSERT INTO projects (name, description) VALUES 
      ('Test Project', 'Project for testing CasparClips')
    `);

    // Insert one event union
    await db.run(`
      INSERT INTO mevent_unions (name, icon, description) VALUES 
      ('Main', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5v14H5V5zm0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>', 'Main event')
    `);

    // Insert one event
    await db.run(`
      INSERT INTO mevents (project_id, title, event_order, event_union_id) VALUES 
      (1, 'Test Event', 1, 1)
    `);

    // Insert test clips - usando nombres de clips en el servidor CasparCG
    const clips = [
      {
        name: 'OUTPUT_000',
        file_path: 'OUTPUT_000',  // Nombre del clip en CasparCG
        channel: 1,
        layer: 10,
        position_row: 0,
        position_column: 0
      },
      {
        name: 'OUTPUT_001',
        file_path: 'OUTPUT_001',  // Nombre del clip en CasparCG
        channel: 1,
        layer: 11,
        position_row: 0,
        position_column: 1
      },
      {
        name: 'OUTPUT_002',
        file_path: 'OUTPUT_002',  // Nombre del clip en CasparCG
        channel: 1,
        layer: 12,
        position_row: 0,
        position_column: 2
      }
    ];

    for (const clip of clips) {
      // Insert clip
      const result = await db.run(`
        INSERT INTO caspar_clips (
          event_id, name, file_path, channel, layer,
          loop, auto_start, transition_type, transition_duration
        ) VALUES (
          1, ?, ?, ?, ?,
          0, 0, 'cut', 0
        )
      `, [clip.name, clip.file_path, clip.channel, clip.layer]);

      // Insert position
      await db.run(`
        INSERT INTO item_positions (
          event_id, item_type, item_id,
          position_row, position_column
        ) VALUES (
          1, 'CasparClip', ?,
          ?, ?
        )
      `, [result.lastID, clip.position_row, clip.position_column]);
    }

    console.log('Database seeded successfully');
    await db.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDb();