"use server";

import getDb from '@/db';

export async function updateItemUnion(
  itemId: number,
  unionId: number,
  position: number,
  delay: number
) {
  try {
    const db = await getDb();
    
    await db.run(
      'UPDATE mitems SET mitem_union_id = ? WHERE id = ?',
      [unionId, itemId]
    );

    // Actualizar position y delay en la relación
    await db.run(`
      UPDATE mitem_unions 
      SET position = ?, delay = ?
      WHERE id = ?
    `, [position, delay, unionId]);

    // Obtener el item actualizado con su nueva unión
    const item = await db.get(`
      SELECT 
        i.*,
        u.name as union_name,
        u.icon as union_icon,
        u.description as union_description,
        u.position as union_position,
        u.delay as union_delay,
        u.compatible_items
      FROM mitems i
      LEFT JOIN mitem_unions u ON i.mitem_union_id = u.id
      WHERE i.id = ?
    `, itemId);

    return {
      success: true,
      item: {
        ...item,
        munion: item.union_name ? {
          id: item.mitem_union_id,
          name: item.union_name,
          icon: item.union_icon,
          description: item.union_description,
          position: item.union_position,
          delay: item.union_delay,
          compatible_items: item.compatible_items.split(',')
        } : null
      }
    };
  } catch (error) {
    console.error('Error updating item union:', error);
    return { 
      success: false, 
      error: 'Failed to update item union' 
    };
  }
}