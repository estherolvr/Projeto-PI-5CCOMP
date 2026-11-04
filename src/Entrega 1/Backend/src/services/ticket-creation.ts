// SQLite allows one writer. Serialize the short number-allocation transaction
// within a process; the unique-number retry still handles other Worker isolates.
let previousCreation: Promise<void> = Promise.resolve()

export async function withTicketCreationLock<T>(create: () => Promise<T>): Promise<T> {
  const previous = previousCreation
  let release!: () => void
  previousCreation = new Promise<void>(resolve => { release = resolve })
  await previous
  try { return await create() } finally { release() }
}
