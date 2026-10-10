/**
 * mobile_app.deletion_requests — account-deletion requests (PRD 8.10, DELETE /v1/me).
 *
 * We NEVER delete the client's loan data (regulatory retention). This only records the
 * customer's request and lets us revoke our sessions + remove device tokens.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('deletion_requests', (t) => {
    t.uuid('id').primary(); // returned as requestId
    t.string('customer_id', 64).notNullable();
    t.enum('status', ['RECEIVED', 'HANDLED']).notNullable().defaultTo('RECEIVED');
    t.datetime('requested_at').notNullable().defaultTo(knex.fn.now());
    t.datetime('handled_at').nullable();
    t.string('handled_by', 64).nullable();

    t.index(['customer_id'], 'idx_deletion_customer');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('deletion_requests');
}
