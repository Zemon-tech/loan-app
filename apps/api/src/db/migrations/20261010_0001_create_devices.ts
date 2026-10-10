/**
 * mobile_app.devices — one row per registered device (PRD 14.4).
 *
 * Created first because sessions.device_id references it. push_token is Phase 2
 * (expo-notifications). No PII beyond what is needed to identify a device.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('devices', (t) => {
    t.uuid('id').primary();
    t.string('customer_id', 64).notNullable();
    t.enum('platform', ['ios', 'android']).notNullable();
    t.string('model', 100).nullable();
    t.string('app_version', 20).nullable();
    t.string('push_token', 255).nullable(); // Phase 2
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    t.datetime('last_seen_at').nullable();

    t.index(['customer_id'], 'idx_devices_customer');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('devices');
}
