
const db = require('./database');

const Products = {
  // Criar produto
  create({
    category,
    name,
    description = '',
    price_cents,
    stock = -1
  }) {
    if (!category || !name) {
      throw new Error('Categoria e nome são obrigatórios.');
    }

    if (!Number.isInteger(price_cents) || price_cents < 0) {
      throw new Error('Preço inválido.');
    }

    if (!Number.isInteger(stock) || stock < -1) {
      throw new Error('Estoque inválido.');
    }

    const result = db.prepare(`
      INSERT INTO products
      (category, name, description, price_cents, stock)
      VALUES (?, ?, ?, ?, ?)
    `).run(category, name, description, price_cents, stock);

    return this.getById(result.lastInsertRowid);
  },

  // Buscar produto por ID
  getById(id) {
    return db.prepare(`
      SELECT * FROM products WHERE id = ?
    `).get(id) || null;
  },

  // Listar todos os produtos ativos
  getAll() {
    return db.prepare(`
      SELECT * FROM products
      WHERE active = 1
      ORDER BY id DESC
    `).all();
  },

  // Listar produtos por categoria
  getByCategory(category) {
    return db.prepare(`
      SELECT * FROM products
      WHERE category = ? AND active = 1
      ORDER BY id DESC
    `).all(category);
  },

  // Atualizar produto
  update(id, data) {
    const allowed = [
      'category',
      'name',
      'description',
      'price_cents',
      'stock'
    ];

    const fields = Object.keys(data).filter(
      key => allowed.includes(key)
    );

    if (!fields.length) {
      throw new Error('Nenhum campo válido para atualizar.');
    }

    if (
      data.price_cents !== undefined &&
      (!Number.isInteger(data.price_cents) || data.price_cents < 0)
    ) {
      throw new Error('Preço inválido.');
    }

    if (
      data.stock !== undefined &&
      (!Number.isInteger(data.stock) || data.stock < -1)
    ) {
      throw new Error('Estoque inválido.');
    }

    const values = fields.map(key => data[key]);

    const sql = `
      UPDATE products
      SET ${fields.map(key => `${key} = ?`).join(', ')}
      WHERE id = ?
    `;

    const result = db.prepare(sql).run(...values, id);

    return result.changes > 0 ? this.getById(id) : null;
  },

  // Ativar produto
  activate(id) {
    return db.prepare(`
      UPDATE products SET active = 1 WHERE id = ?
    `).run(id).changes > 0;
  },

  // Desativar produto
  deactivate(id) {
    return db.prepare(`
      UPDATE products SET active = 0 WHERE id = ?
    `).run(id).changes > 0;
  },

  // Excluir produto permanentemente
  delete(id) {
    return db.prepare(`
      DELETE FROM products WHERE id = ?
    `).run(id).changes > 0;
  },

  // Verificar estoque
  hasStock(id, quantity = 1) {
    const product = this.getById(id);

    if (!product || !product.active || quantity < 1) {
      return false;
    }

    return product.stock === -1 || product.stock >= quantity;
  },

  // Diminuir estoque
  removeStock(id, quantity) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Quantidade inválida.');
    }

    const result = db.prepare(`
      UPDATE products
      SET stock = CASE
        WHEN stock = -1 THEN -1
        ELSE stock - ?
      END
      WHERE id = ?
      AND active = 1
      AND (stock = -1 OR stock >= ?)
    `).run(quantity, id, quantity);

    return result.changes > 0;
  },

  // Aumentar estoque
  addStock(id, quantity) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Quantidade inválida.');
    }

    const result = db.prepare(`
      UPDATE products
      SET stock = CASE
        WHEN stock = -1 THEN -1
        ELSE stock + ?
      END
      WHERE id = ?
    `).run(quantity, id);

    return result.changes > 0;
  }
};

module.exports = Products;
