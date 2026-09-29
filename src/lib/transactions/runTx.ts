import type { TxEvent } from './stateMachine'

/**
 * Drives the tx state machine for a real wallet transaction:
 * START → REQUEST_SIGNATURE → SUBMITTED(hash) → CONFIRMED(hash)
 *
 * `CONFIRMED` is dispatched only when `run` resolves, i.e. after the caller has
 * observed a successful receipt. Wallet rejections map to `REJECTED`, all
 * other errors to `FAILED` with a readable message.
 */
export async function runTx<T>(
  dispatch: (e: TxEvent) => void,
  run: (hooks: { onSignatureRequest: () => void; onSubmitted: (hash: string) => void }) => Promise<T & { hash: string }>,
  opts: { isRejection: (e: unknown) => boolean; message: (e: unknown) => string },
): Promise<T | null> {
  dispatch({ type: 'START', simulated: false })
  let signed = false
  try {
    const result = await run({
      onSignatureRequest: () => {
        if (!signed) dispatch({ type: 'REQUEST_SIGNATURE' })
        signed = true
      },
      onSubmitted: (hash) => dispatch({ type: 'SUBMITTED', hash }),
    })
    dispatch({ type: 'CONFIRMED', hash: result.hash })
    return result
  } catch (e) {
    if (opts.isRejection(e)) dispatch({ type: 'REJECTED' })
    else dispatch({ type: 'FAILED', error: opts.message(e) })
    return null
  }
}
