/**
 * mobile_app.otp_requests — one row per OTP challenge (PRD 11.1, 14.4).
 *
 * The OTP is NEVER stored in plaintext: otp_hmac = HMAC-SHA256(otp, secret + id).
 * mobile_hash is HMAC of the normalised mobile (never plaintext). customer_id is NULL
 * for unknown numbers so the request shape is identical whether or not a customer matched
 * (anti-enumeration, PRD 10.4).
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('otp_requests', (t) => {
    t.uuid('id').primary(); // returned to the client as otpRequestId
    t.specificType('mobile_hash', 'char(64)').notNullable(); // HMAC-SHA256 hex
    t.string('customer_id', 64).nullable();
    t.specificType('otp_hmac', 'char(64)').notNullable(); // HMAC-SHA256 hex
    t.tinyint('attempts').notNullable().defaultTo(0);
    t.datetime('expires_at').notNullable();
    t.datetime('consumed_at').nullable();
    t.string('ip', 45).nullable(); // IPv4/IPv6
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['mobile_hash', 'created_at'], 'idx_otp_mobile_created');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('otp_requests');
}
