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
    await db.run('DELETE FROM mitem_unions');
    await db.run('DELETE FROM item_positions');
    await db.run('DELETE FROM caspar_clips');
    await db.run('DELETE FROM caspar_cameras');
    await db.run('DELETE FROM caspar_graphics');
    await db.run('DELETE FROM caspar_microphones');
    await db.run('DELETE FROM casparcg_servers');
    await db.run('DELETE FROM caspar_channels');

    // Reset autoincrement
    await db.run('DELETE FROM sqlite_sequence');

    // Insert CasparCG server from the image
    await db.run(`
      INSERT INTO casparcg_servers (
        name, host, port, description, username, password,
        preview_channel, locked_channel, is_shadow, enabled
      ) VALUES (
        'LENOVO', '192.168.0.194', 5250, NULL,
        NULL, NULL, 2, 1, 0, 1
      )
    `);

    // Insert exactly 3 projects
    await db.run(`
      INSERT INTO projects (name, description) VALUES 
      ('Morning News', 'Daily morning news program'),
      ('Sports Live', 'Live sports broadcast coverage'),
      ('Evening Show', 'Prime time variety show')
    `);

    // Insert event unions
    await db.run(`
      INSERT INTO mevent_unions (name, icon, description) VALUES 
      ('Header', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 15.93a7 7 0 1 0-2 0V20H6a1 1 0 0 0 0 2h12a1 1 0 0 0 0-2h-5zM12 14a5 5 0 1 1 5-5 5 5 0 0 1-5 5"/></svg>', 'Program header'),
      ('News', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5v14H5V5zm0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-5 14H7v-2h7zm3-4H7v-2h10zm0-4H7V7h10z"/></svg>', 'News segment'),
      ('Sports', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/></svg>', 'Sports segment')
    `);

    // Insert events for each project
    await db.run(`
      INSERT INTO mevents (project_id, title, event_order, event_union_id) VALUES 
      -- Morning News (project_id: 1)
      (1, 'Opening Headlines', 1, 1),
      (1, 'Top Stories', 2, 2),
      (1, 'Weather Report', 3, 2),
      
      -- Sports Live (project_id: 2)
      (2, 'Pre-Game Show', 1, 1),
      (2, 'First Half', 2, 3),
      (2, 'Half-Time Analysis', 3, 3),
      
      -- Evening Show (project_id: 3)
      (3, 'Show Opening', 1, 1),
      (3, 'Guest Interview', 2, 2),
      (3, 'Musical Performance', 3, 2)
    `);

    // Insert item unions
    await db.run(`
      INSERT INTO mitem_unions (name, description, icon, compatible_items, position, delay) VALUES
      ('Play', 'Standard playback', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>', 'CasparClip,obsClip', 0, 0),
      ('Loop', 'Loop playback', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>', 'CasparClip,obsClip', 0, 0),
      ('Live', 'Live input', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/></svg>', 'casparCamera,obsCamera', 1, 0)
    `);

    // Insert items
    // First, insert the base positions
    await db.run(`
      INSERT INTO item_positions (event_id, item_type, item_id, position_row, position_column) VALUES 
      -- Morning News - Opening Headlines
      (1, 'CasparClip', 1, 1, 1),
      (1, 'CasparClip', 2, 1, 2),
      (1, 'casparCamera', 3, 2, 1),
      (1, 'casparCamera', 4, 2, 2),
      
      -- Morning News - Top Stories
      (2, 'CasparClip', 5, 1, 1),
      (2, 'casparCamera', 6, 1, 2),
      (2, 'CasparClip', 7, 2, 1),
      (2, 'CasparClip', 8, 2, 2),
      
      -- Sports Live - Pre-Game Show
      (4, 'CasparClip', 9, 1, 1),
      (4, 'casparCamera', 10, 1, 2),
      (4, 'casparCamera', 11, 2, 1),
      (4, 'CasparClip', 12, 2, 2),
      
      -- Evening Show - Show Opening
      (7, 'CasparClip', 13, 1, 1),
      (7, 'casparCamera', 14, 1, 2),
      (7, 'CasparClip', 15, 2, 1),
      (7, 'casparCamera', 16, 2, 2)
    `);

    // Insert Caspar Clips
    await db.run(`
      INSERT INTO caspar_clips (id, event_id, name, file_path, channel, layer, loop, auto_start) VALUES
      (1, 1, 'Opening Theme', 'AMB/OPENING.mp4', 1, 10, 0, 1),
      (2, 1, 'Headlines BG', 'AMB/NEWS_BG.mp4', 1, 11, 1, 1),
      (5, 2, 'Story 1', 'NEWS/STORY1.mp4', 1, 10, 0, 0),
      (7, 2, 'Story 2', 'NEWS/STORY2.mp4', 1, 11, 0, 0),
      (8, 2, 'Weather Loop', 'GFX/WEATHER_LOOP.mp4', 1, 12, 1, 1),
      (9, 4, 'Sports Intro', 'SPORTS/INTRO.mp4', 1, 10, 0, 1),
      (12, 4, 'Game Highlights', 'SPORTS/HIGHLIGHTS.mp4', 1, 11, 0, 0),
      (13, 7, 'Show Opening', 'SHOWS/OPENING.mp4', 1, 10, 0, 1),
      (15, 7, 'Guest Intro', 'SHOWS/GUEST.mp4', 1, 11, 0, 0)
    `);

    console.log('Database seeded successfully');
    await db.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDb();