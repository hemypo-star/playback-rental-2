import net from 'node:net'
import tls from 'node:tls'
import { createInterface, type Interface as ReadlineInterface } from 'node:readline'
import type { Duplex } from 'node:stream'

interface SmtpMail {
  to: string
  subject: string
  html: string
}

interface ReplyReader {
  read: () => Promise<{ code: number; lines: string[] }>
  close: () => void
}

function replyReader(socket: Duplex): ReplyReader {
  const rl = createInterface({ input: socket })
  const iterator = rl[Symbol.asyncIterator]()

  return {
    async read() {
      const lines: string[] = []
      let code = 0
      for (;;) {
        const result = await iterator.next()
        if (result.done) throw new Error('SMTP connection closed unexpectedly')
        const line = String(result.value)
        lines.push(line)
        const match = /^(\d{3})([ -])/.exec(line)
        if (!match) continue
        code = Number(match[1])
        if (match[2] === ' ') return { code, lines }
      }
    },
    close() {
      ;(rl as ReadlineInterface).close()
    },
  }
}

function waitConnected(socket: net.Socket | tls.TLSSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const readyEvent = socket instanceof tls.TLSSocket ? 'secureConnect' : 'connect'
    const onReady = () => {
      cleanup()
      resolve()
    }
    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }
    const cleanup = () => {
      socket.off(readyEvent, onReady)
      socket.off('error', onError)
    }
    socket.once(readyEvent, onReady)
    socket.once('error', onError)
  })
}

async function expect(reader: ReplyReader, expected: number | number[], label: string): Promise<void> {
  const reply = await reader.read()
  const allowed = Array.isArray(expected) ? expected : [expected]
  if (!allowed.includes(reply.code)) {
    throw new Error(`${label}: SMTP ${reply.code} ${reply.lines.join(' | ')}`)
  }
}

async function command(
  socket: Duplex,
  reader: ReplyReader,
  line: string,
  expected: number | number[],
  label: string,
): Promise<void> {
  socket.write(`${line}\r\n`)
  await expect(reader, expected, label)
}

function headerBase64(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

function wrapBase64(value: string): string {
  return value.match(/.{1,76}/g)?.join('\r\n') || ''
}

function mailbox(value: string): string {
  const match = /<([^>]+)>/.exec(value)
  return (match?.[1] || value).trim()
}

function smtpConfig() {
  const host = process.env.SMTP_HOST
  const from = process.env.SMTP_FROM
  if (!host || !from) throw new Error('SMTP_HOST and SMTP_FROM are required')
  const secure = (process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false'
  const port = Number(process.env.SMTP_PORT || (secure ? 465 : 587))
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error('SMTP_PORT is invalid')
  return {
    host,
    port,
    secure,
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from,
  }
}

export async function sendSmtpMail(mail: SmtpMail): Promise<void> {
  const config = smtpConfig()
  const timeoutMs = Number(process.env.SMTP_TIMEOUT_MS || 15_000)

  let socket: net.Socket | tls.TLSSocket = config.secure
    ? tls.connect({ host: config.host, port: config.port, servername: config.host, rejectUnauthorized: true })
    : net.connect({ host: config.host, port: config.port })

  socket.setTimeout(timeoutMs, () => socket.destroy(new Error('SMTP timeout')))
  await waitConnected(socket)
  let reader = replyReader(socket)

  try {
    await expect(reader, 220, 'greeting')
    await command(socket, reader, `EHLO ${process.env.SMTP_HELO_NAME || 'playbackrental.local'}`, 250, 'EHLO')

    if (!config.secure) {
      await command(socket, reader, 'STARTTLS', 220, 'STARTTLS')
      reader.close()
      const plainSocket = socket
      socket = tls.connect({ socket: plainSocket, servername: config.host, rejectUnauthorized: true })
      socket.setTimeout(timeoutMs, () => socket.destroy(new Error('SMTP timeout')))
      await waitConnected(socket)
      reader = replyReader(socket)
      await command(socket, reader, `EHLO ${process.env.SMTP_HELO_NAME || 'playbackrental.local'}`, 250, 'EHLO after STARTTLS')
    }

    if (config.user) {
      if (!config.password) throw new Error('SMTP_PASSWORD is required when SMTP_USER is set')
      await command(socket, reader, 'AUTH LOGIN', 334, 'AUTH LOGIN')
      await command(socket, reader, Buffer.from(config.user).toString('base64'), 334, 'SMTP username')
      await command(socket, reader, Buffer.from(config.password).toString('base64'), 235, 'SMTP password')
    }

    await command(socket, reader, `MAIL FROM:<${mailbox(config.from)}>`, 250, 'MAIL FROM')
    await command(socket, reader, `RCPT TO:<${mailbox(mail.to)}>`, [250, 251], 'RCPT TO')
    await command(socket, reader, 'DATA', 354, 'DATA')

    const html = wrapBase64(Buffer.from(mail.html, 'utf8').toString('base64'))
    const message = [
      `From: ${config.from}`,
      `To: ${mail.to}`,
      `Subject: ${headerBase64(mail.subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      html,
      '.',
      '',
    ].join('\r\n')
    socket.write(message)
    await expect(reader, 250, 'message body')
    await command(socket, reader, 'QUIT', 221, 'QUIT')
  } finally {
    reader.close()
    socket.destroy()
  }
}
