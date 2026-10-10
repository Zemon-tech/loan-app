/**
 * mobile_app.audit_log — security events (PRD 11.4, 14.4).
 *
 * Records auth/session lifecycle events. NEVER stores OTPs, tokens, mobile numbers, names,
 * or financial values. customer_id is the opaque id only; meta_json holds safe metadata.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_log', (t) => {
    t.bigIncrements('id').primary();
    t.datetime('ts').notNullable().defaultTo(knex.fn.now());
    // e.g. otp_requested, otp_verified, otp_failed, login, logout, refresh_reuse, deletion_requested
    t.string('event', 50).notNullable();
    t.string('customer_id', 64).nullable();
    t.string('ip', 45).nullable();
    t.uuid('device_id').nullable();
    t.uuid('request_id').nullable();
    t.json('meta_json').nullable();

    t.index(['event', 'ts'], 'idx_audit_event_ts');
    t.index(['customer_id'], 'idx_audit_customer');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_log');
}
