/* eslint-disable @typescript-eslint/naming-convention */
import chalk from 'chalk'
import * as dotenv from 'dotenv'
import Postgrator from 'postgrator'
import pg from 'pg'

dotenv.config()

const log = (text: string, style: typeof chalk.white = chalk.white): void =>
  console.log(`${chalk.cyanBright('>')} ${style(text)}`)

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

const postgrator = new Postgrator({
  migrationDirectory: __dirname + '/migrations',
  driver: 'pg',
  execQuery: (query) => client.query(query),
  // Schema table name
  schemaTable: 'schemaversion',
  // Validate migration md5 checksum to ensure the contents of the script have not changed
  validateChecksums: true,
})

log('Starting migration manager')

const targetMigration = process.argv[2]

const targetMigrationLabel = targetMigration
  ? `'${chalk.blue(targetMigration)}'`
  : chalk.blue('latest')

log(`Migrating to ${targetMigrationLabel}.\n`)

const logAppliedMigrations = (
  appliedMigrations: Postgrator.Migration[]
): void => {
  if (appliedMigrations.length > 0) {
    log(
      `Applied ${chalk.green(
        appliedMigrations.length.toString()
      )} migrations successfully:`
    )
    for (const migration of appliedMigrations) {
      const actionLabel =
        migration.action === 'do' ? chalk.green('+') : chalk.red('-')
      console.log(`  ${actionLabel} ${migration.name}`)
    }
  } else {
    log(`No Postgres migrations applied.`)
  }
}

// postgres migration
const postgresMigration = client.connect()
  .then(() => postgrator.migrate(targetMigration))
  .then(logAppliedMigrations)
  .catch((error) => {
    log(
      `${chalk.red('Postgres migration failed: ')}${error.message}`,
      chalk.red
    )
    const { appliedMigrations } = error
    logAppliedMigrations(appliedMigrations)
    process.exit(1)
  })

postgresMigration.then(() => log('Exiting...'))
