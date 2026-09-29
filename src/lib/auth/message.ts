/**
 * Human-readable sign-in message (EIP-4361 style). Built in the browser and
 * checked on the server (domain + single-use nonce) before the signature is
 * verified. Signing it never triggers a transaction.
 */
export function signInMessage(opts: { domain: string; address: string; uri: string; chainId: number; nonce: string; issuedAt: string }): string {
  return [
    `${opts.domain} wants you to sign in with your Ethereum account:`,
    opts.address,
    '',
    'Sign in to Achilyon. This request does not trigger a transaction or cost any gas.',
    '',
    `URI: ${opts.uri}`,
    'Version: 1',
    `Chain ID: ${opts.chainId}`,
    `Nonce: ${opts.nonce}`,
    `Issued At: ${opts.issuedAt}`,
  ].join('\n')
}
