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

-- Base position tracking for all items
CREATE TABLE IF NOT EXISTS item_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK(item_type IN ('CasparClip', 'casparCamera', 'casparGraphic', 'casparMicrophone', 'obsClip', 'obsCamera', 'obsGraphic', 'obsMicrophone')),
  item_id INTEGER NOT NULL,
  position_row INTEGER NOT NULL,
  position_column INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES mevents(id) ON DELETE CASCADE
);

-- CasparCG Clips
CREATE TABLE IF NOT EXISTS caspar_clips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  channel INTEGER,
  layer INTEGER,
  loop BOOLEAN DEFAULT FALSE,
  auto_start BOOLEAN DEFAULT FALSE,
  transition_type TEXT,
  transition_duration INTEGER,
  FOREIGN KEY (event_id) REFERENCES mevents(id) ON DELETE CASCADE
);

-- CasparCG Cameras
CREATE TABLE IF NOT EXISTS caspar_cameras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  device_id TEXT NOT NULL,
  channel INTEGER,
  layer INTEGER,
  preview_enabled BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (event_id) REFERENCES mevents(id) ON DELETE CASCADE
);

-- CasparCG Graphics
CREATE TABLE IF NOT EXISTS caspar_graphics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  channel INTEGER,
  layer INTEGER,
  template_data TEXT,
  FOREIGN KEY (event_id) REFERENCES mevents(id) ON DELETE CASCADE
);

-- CasparCG Microphones
CREATE TABLE IF NOT EXISTS caspar_microphones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  device_id TEXT NOT NULL,
  channel INTEGER,
  layer INTEGER,
  volume REAL DEFAULT 1.0,
  FOREIGN KEY (event_id) REFERENCES mevents(id) ON DELETE CASCADE
);

-- OBS Clips
CREATE TABLE IF NOT EXISTS obs_clips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  scene_name TEXT NOT NULL,
  source_name TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES mevents(id) ON DELETE CASCADE
);

-- OBS Cameras
CREATE TABLE IF NOT EXISTS obs_cameras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  device_id TEXT NOT NULL,
  scene_name TEXT NOT NULL,
  filters TEXT,
  FOREIGN KEY (event_id) REFERENCES mevents(id) ON DELETE CASCADE
);

-- OBS Graphics
CREATE TABLE IF NOT EXISTS obs_graphics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  scene_name TEXT NOT NULL,
  source_name TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES mevents(id) ON DELETE CASCADE
);

-- OBS Microphones
CREATE TABLE IF NOT EXISTS obs_microphones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  device_id TEXT NOT NULL,
  scene_name TEXT NOT NULL,
  volume REAL DEFAULT 1.0,
  FOREIGN KEY (event_id) REFERENCES mevents(id) ON DELETE CASCADE
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
  is_shadow INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  version TEXT,
  channel_formats TEXT,
  media_files TEXT,
  command_timeout INTEGER DEFAULT 5000,
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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mevents_project_id ON mevents(project_id);
CREATE INDEX IF NOT EXISTS idx_mevents_event_union_id ON mevents(event_union_id);
CREATE INDEX IF NOT EXISTS idx_item_positions_event_id ON item_positions(event_id);
CREATE INDEX IF NOT EXISTS idx_caspar_channels_server ON caspar_channels(server_id);
CREATE INDEX IF NOT EXISTS idx_caspar_layers_channel ON caspar_layers(channel_id);

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