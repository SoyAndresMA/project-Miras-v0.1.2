-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- MEvent Unions table (predefined catalog)
CREATE TABLE IF NOT EXISTS mevent_unions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT
);

-- MEvents table
CREATE TABLE IF NOT EXISTS mevents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  event_order INTEGER NOT NULL,
  event_union_id INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (event_union_id) REFERENCES mevent_unions(id)
);

-- MItem Unions table
CREATE TABLE IF NOT EXISTS mitem_unions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  compatible_items TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  delay REAL DEFAULT 0.0
);

-- MItems table
CREATE TABLE IF NOT EXISTS mitems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  position_row INTEGER NOT NULL,
  position_column INTEGER NOT NULL,
  mitem_union_id INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES mevents(id) ON DELETE CASCADE,
  FOREIGN KEY (mitem_union_id) REFERENCES mitem_unions(id)
);

-- CasparCG Servers table
CREATE TABLE IF NOT EXISTS casparcg_servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  description TEXT,
  username TEXT,
  password TEXT,
  preview_channel INTEGER,
  locked_channel INTEGER,
  is_shadow BOOLEAN DEFAULT 0,
  enabled BOOLEAN DEFAULT 1,
  version TEXT,
  channel_formats TEXT,
  last_connection DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CasparCG Channels table
CREATE TABLE IF NOT EXISTS caspar_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  channel_number INTEGER NOT NULL,
  resolution TEXT NOT NULL,
  frameRate INTEGER NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  FOREIGN KEY (server_id) REFERENCES casparcg_servers(id) ON DELETE CASCADE
);

-- CasparCG Layers table
CREATE TABLE IF NOT EXISTS caspar_layers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL,
  layer_number INTEGER NOT NULL,
  current_media TEXT,
  status TEXT CHECK(status IN ('playing', 'stopped', 'paused')),
  volume REAL DEFAULT 1.0 CHECK(volume >= 0.0 AND volume <= 1.0),
  muted BOOLEAN DEFAULT false,
  FOREIGN KEY (channel_id) REFERENCES caspar_channels(id) ON DELETE CASCADE
);

-- Caspar Clips table
CREATE TABLE IF NOT EXISTS caspar_clips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  channel INTEGER NOT NULL,
  layer INTEGER NOT NULL,
  loop BOOLEAN DEFAULT false,
  transition_type TEXT,
  transition_duration INTEGER,
  auto_start BOOLEAN DEFAULT false,
  FOREIGN KEY (item_id) REFERENCES mitems(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mevents_project_id ON mevents(project_id);
CREATE INDEX IF NOT EXISTS idx_mevents_event_union_id ON mevents(event_union_id);
CREATE INDEX IF NOT EXISTS idx_mitems_event_id ON mitems(event_id);
CREATE INDEX IF NOT EXISTS idx_mitems_union_id ON mitems(mitem_union_id);
CREATE INDEX IF NOT EXISTS idx_caspar_channels_server ON caspar_channels(server_id);
CREATE INDEX IF NOT EXISTS idx_caspar_layers_channel ON caspar_layers(channel_id);
CREATE INDEX IF NOT EXISTS idx_caspar_clips_item ON caspar_clips(item_id);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_projects_timestamp 
AFTER UPDATE ON projects
BEGIN
  UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_casparcg_servers_timestamp 
AFTER UPDATE ON casparcg_servers
BEGIN
  UPDATE casparcg_servers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;