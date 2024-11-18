import { CasparServer } from '@/server/device/caspar/CasparServer';
import { Logger } from '@/server/device/caspar/utils/Logger';

async function testConnection() {
  const logger = new Logger('TestConnection');
  const server = new CasparServer({
    id: 1,
    name: 'Test Server',
    host: '192.168.0.194',
    port: 5250,
    commandTimeout: 2000 // Reducir el timeout para pruebas
  }, logger);

  try {
    logger.info('Conectando al servidor...');
    await server.connect();
    logger.info('Conexión establecida');

    // Probar comandos básicos
    logger.info('Probando comando VERSION...');
    const versionResponse = await server.sendCommand('VERSION\r\n');
    logger.info('Versión:', versionResponse);

    // Esperar un poco antes de desconectar
    await new Promise(resolve => setTimeout(resolve, 5000));

    logger.info('Desconectando...');
    await server.disconnect();
    logger.info('Desconectado');

  } catch (error) {
    logger.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testConnection();
