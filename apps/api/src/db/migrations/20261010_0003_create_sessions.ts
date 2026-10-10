/**
 * mobile_app.sessions — one row per logged-in device session (PRD 11.2, 14.4).
 *
 * Backs rotating refresh tokens. refresh_hash = SHA-256 of the opaque refresh token
 * (never plaintext). id is the JWT `sid` claim. family_id groups a rotation chain: reuse
 * of an already-rotated token revokes the whole family (theft detection).
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sessions', (t) => {
    t.uuid('id').primary(); // = JWT sid
    t.string('customer_id', 64).notNullable();
    t.specificType('refresh_hash', 'char(64)').notNullable(); // SHA-256 hex
    t.uuid('family_id').notNullable();
    t.uuid('device_id').nullable();
    t.datetime('expires_at').notNullable();
    t.datetime('rotated_at').nullable();
    t.datetime('revoked_at').nullable();
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());

    t.unique(['refresh_hash'], { indexName: 'uq_sessions_refresh_hash' });
    t.index(['customer_id'], 'idx_sessions_customer');
    t.index(['family_id'], 'idx_sessions_family');

    // device_id references devices.id; ON DELETE SET NULL so removing a device keeps the
    // session row auditable. Created in a separate migration guard below if needed.
    t.foreign('device_id', 'fk_sessions_device')
      .references('id')
      .inTable('devices')
      .onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sessions');
}
