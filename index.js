const Twit = require('twit')
const Telegram = require('telegraf/telegram')
const fetch = require('node-fetch')
const cron = require('node-cron')

const T = new Twit({
  consumer_key: process.env.TWITTER_KEY,
  consumer_secret: process.env.TWITTER_SECRET,
  app_only_auth: true,
})
const telegram = new Telegram(process.env.TG_TOKEN)
const channelId = process.env.TG_CHANNEL_ID

const pastUpdates = []

async function getErixxDe() {
  // get csrf cookie first
  const response = await fetch('https://www.erixx.de')
  const cookie = response.headers.get('set-cookie')
  const troubles = await fetch('https://www.erixx.de/livedata/etc?type=troublelist&product=erixx', {
    headers: { cookie },
  }).then(resp => resp.json())
  return troubles.map(trouble => trouble.text)
}

async function getErixxTweets() {
  const response = await T.get('/statuses/user_timeline', {
    screen_name: 'erixxinfo',
    tweet_mode: 'extended',
    count: 20,
  })
  const tweets = response.data
  return tweets.map(tweet => tweet.full_text)
}

async function main() {
  const allUpdates = [].concat(await getErixxDe(), await getErixxTweets())
  const updates = allUpdates.filter(text => {
    const hotPhrases = process.env.HOT_PHRASES.split(',')
    const matches = hotPhrases.filter(phrase => text.includes(phrase)).length
    return matches >= +process.env.HOT_PHRASE_THRESHOLD
  })
  const newUpdates = updates.filter(update => !pastUpdates.includes(update))
  for (const update of newUpdates) {
    await telegram.sendMessage(channelId, update)
    console.log('update:', update)
    pastUpdates.push(update)
  }
  pastUpdates.splice(50)
}

main()
cron.schedule('0 */15 * * * *', main)