import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const config=sqliteTable('noor_config',{key:text('key').primaryKey(),value:text('value').notNull()});
export const subscriptions=sqliteTable('noor_subscriptions',{id:text('id').primaryKey(),owner:text('owner').notNull(),subscription:text('subscription').notNull(),place:text('place').notNull(),settings:text('settings').notNull(),updated:integer('updated').notNull()});
export const deliveries=sqliteTable('noor_deliveries',{id:text('id').primaryKey(),sent:integer('sent').notNull()});
