const Telegram = require('telegraf/telegram')
const fetch = require('node-fetch')
const cron = require('node-cron')

const telegram = new Telegram(process.env.TG_TOKEN)
const channelId = process.env.TG_CHANNEL_ID

let lastUpdates = []

async function getErixxDe() {
  // get csrf cookie first
  const response = await fetch('https://www.erixx.de')
  const cookie = response.headers.get('set-cookie')
  const troubles = await fetch('https://www.erixx.de/livedata/etc?type=troublelist&product=erixx', {
    headers: { cookie },
  }).then(resp => resp.json())
  return troubles.map(trouble => trouble.text)
}

async function main() {
  const allUpdates = await getErixxDe()
  const updates = allUpdates.filter(text => {
    // TODO filter by bhfvonid & bhvfnachid
    const hotPhrases = process.env.HOT_PHRASES.split(',')
    const coldPhrases = process.env.COLD_PHRASES.split(',')
    const matches = hotPhrases.filter(phrase => text.includes(phrase)).length
    return matches >= +process.env.HOT_PHRASE_THRESHOLD && coldPhrases.every(phrase => !text.includes(phrase))
  })
  const newUpdates = updates.filter(update => !lastUpdates.includes(update))
  for (const update of newUpdates) {
    await telegram.sendMessage(channelId, update)
    console.log('update:', update)
  }
  lastUpdates = updates
}

main()
cron.schedule('0 */h15 * * * *', main)