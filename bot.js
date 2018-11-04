const Discord = require('discord.js');
const client = new Discord.Client();
const ayarlar = require('./ayarlar.json');
const chalk = require('chalk');
const fs = require('fs');
const moment = require('moment');
require('./util/eventLoader')(client);

var prefix = ayarlar.prefix;

const log = message => {
  console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ${message}`);
};

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
fs.readdir('./komutlar/', (err, files) => {
  if (err) console.error(err);
  log(`${files.length} komut yüklenecek.`);
  files.forEach(f => {
    let props = require(`./komutlar/${f}`);
    log(`Yüklenen komut: ${props.help.name}.`);
    client.commands.set(props.help.name, props);
    props.conf.aliases.forEach(alias => {
      client.aliases.set(alias, props.help.name);
    });
  });
});

client.reload = command => {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(`./komutlar/${command}`)];
      let cmd = require(`./komutlar/${command}`);
      client.commands.delete(command);
      client.aliases.forEach((cmd, alias) => {
        if (cmd === command) client.aliases.delete(alias);
      });
      client.commands.set(command, cmd);
      cmd.conf.aliases.forEach(alias => {
        client.aliases.set(alias, cmd.help.name);
      });
      resolve();
    } catch (e){
      reject(e);
    }
  });
};

client.load = command => {
  return new Promise((resolve, reject) => {
    try {
      let cmd = require(`./komutlar/${command}`);
      client.commands.set(command, cmd);
      cmd.conf.aliases.forEach(alias => {
        client.aliases.set(alias, cmd.help.name);
      });
      resolve();
    } catch (e){
      reject(e);
    }
  });
};

client.unload = command => {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(`./komutlar/${command}`)];
      let cmd = require(`./komutlar/${command}`);
      client.commands.delete(command);
      client.aliases.forEach((cmd, alias) => {
        if (cmd === command) client.aliases.delete(alias);
      });
      resolve();
    } catch (e){
      reject(e);
    }
  });
};

client.on('message', msg => {
  if (msg.content.toLowerCase() === 'Hi') {
    msg.reply('Hello!');
  }
});



client.elevation = message => {
  if(!message.guild) {
	return; }
  let permlvl = 0;
  if (message.member.hasPermission("BAN_MEMBERS")) permlvl = 2;
  if (message.member.hasPermission("ADMINISTRATOR")) permlvl = 3;
  if (message.author.id === ayarlar.sahip) permlvl = 4;
  return permlvl;
};

const { Client, Util } = require('discord.js');
const ytdl = require("ytdl-core");
const { token, GOOGLE_API_KEY } = require('./ayarlar.json');
const YouTube = require('simple-youtube-api');
const http = require('http');


const youtube = new YouTube(GOOGLE_API_KEY);

const queue = new Map();

client.on('warn', console.warn);

client.on('error', console.error);

client.on('ready', () => console.log('Müzik kodları Aktif! iyi dinlemeler moruk'));

client.on('disconnect', () => console.log('bağlantı kesildi. tekrar bağlanmaya çalışıyorum.'));

client.on('reconnecting', () => console.log('Tekrar bağlanıyorum..'));

client.on('message', async msg => { // eslint-disable-line
if (msg.author.bot) return undefined;
if (!msg.content.startsWith(ayarlar.prefix)) return undefined;

const args = msg.content.split(' ');
const searchString = args.slice(1).join(' ');
const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
const serverQueue = queue.get(msg.guild.id);

let command = msg.content.toLowerCase().split(' ')[0];
command = command.slice(ayarlar.prefix.length)

if (command === 'play') {
if (!msg.guild) {
const ozelmesajuyari = new Discord.RichEmbed()
.setDescription(`You can not use commands here.`)
return msg.author.sendEmbed(ozelmesajuyari); }
const voiceChannel = msg.member.voiceChannel;
if (!voiceChannel) return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription(' ❎ | İlk olarak sesli bir kanala giriş yapmanız gerek.'));
const permissions = voiceChannel.permissionsFor(msg.client.user);
if (!permissions.has('CONNECT')) {
return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription('🚫 | Şuanda olduğunuz kanala girmek için gerekli izinlere sahip değilim.'));
}
if (!permissions.has('SPEAK')) {
return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription('🚫 | Şarkı başlatılamıyor. Lütfen mikrofonumu açınız.'));
}

if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
const playlist = await youtube.getPlaylist(url);
const videos = await playlist.getVideos();
for (const video of Object.values(videos)) {
const video2 = await youtube.getVideoByID(video.id); // ehehehehu videomuzu bulalım
await handleVideo(video2, msg, voiceChannel, true); // ve gönderelim
}
return msg.channel.sendEmbed(new Discord.RichEmbed)
.setDescription(`✔ | Playlist ➢ **${playlist.title}** has been added to the queue!`);
} else {
try {
var video = await youtube.getVideo(url);
} catch (error) {
try {
var videos = await youtube.searchVideos(searchString, 10);
let index = 0;
msg.channel.sendEmbed(new Discord.RichEmbed()
.setAuthor(`Şarkı seçimi`, `https://images.vexels.com/media/users/3/137425/isolated/preview/f2ea1ded4d037633f687ee389a571086-youtube-icon-logo-by-vexels.png`)
.setDescription(`
${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}
\n **Lütfen 1-10 arasındaki şarkılardan bir tanesini seçin, 30 saniye sonra iptal edilecektir.**
`)
.setColor('32363E'));
// en fazla 5 tane 
try {
var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
maxMatches: 1,
time: 10000,
errors: ['time']
});
} catch (err) {
console.error(err);
return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription('❎ | Şarkı seçimi iptal edildi. '));
}
const videoIndex = parseInt(response.first().content);
var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
} catch (err) {
console.error(err);
return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription(' ❎ |  Youtubede aradım ama bulamadım.'));
}
}
return handleVideo(video, msg, voiceChannel);
}
} else if (command === 'skip') {
if (!msg.guild) {
const ozelmesajuyari = new Discord.RichEmbed()
.setDescription(`You can not use commands here.`)
return msg.author.sendEmbed(ozelmesajuyari); }
if (!msg.member.voiceChannel) return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription(' ❎ | Lütfen öncelikle sesli bir kanala katılınız.'));
if (!serverQueue) return msg.channel.send(' ❎ | Kuyruk boş olduğu için geçemiyorum. ');
serverQueue.connection.dispatcher.end('Geç komudu kullanıldı.');
return undefined;
} else if (command === 'qweqweqwedosgjsdflkh242309857238957y239856239856012356') {
if (!msg.guild) {
const ozelmesajuyari = new Discord.RichEmbed()
.setDescription(`You can not use commands here.`)
return msg.author.sendEmbed(ozelmesajuyari); }
if (!msg.member.voiceChannel) return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription(' ❎ | Lütfen öncelikle sesli bir kanala katılınız.'));
if (!serverQueue) return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription(' ❎ | Herhangi bir şarkı çalmıyor.'));
serverQueue.songs = [];
serverQueue.connection.dispatcher.end('Kapat komutu kullanıldı!');
return undefined;
} else if (command === 'voice') {
if (!message.guild) {
if (!msg.guild) {
const ozelmesajuyari = new Discord.RichEmbed()
.setDescription(`Bu komutu kullanamazsın.`)
return msg.author.sendEmbed(ozelmesajuyari); }
if (!msg.member.voiceChannel) return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription(' ❎ | Sesli kanala katılmanız lazım!'));
if (!serverQueue) return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription(' ❎ | Şu anda herhangi bir şarkı çalmıyorum.'));
if (!args[1]) return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription(` <:hope:412142425838977024> | Ses seviyesi: **${serverQueue.volume}**`));
serverQueue.volume = args[1];
serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
return msg.channel.sendEmbed(new Discord.RichEmbed()
(` <:hope:412142425838977024> | Yeni ses seviyesi: **${args[1]}**`));
}
} else if (command === 'songname') {
if (!msg.guild) {
const ozelmesajuyari = new Discord.RichEmbed()
.setDescription(`<:uyari:405162608631480320> | Şu anda hiçbir şey çalmıyorum.`)
return msg.author.sendEmbed(ozelmesajuyari); }
if (!serverQueue) return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription('There is nothing playing.'));
return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription(`🎶 Currently Playing: **${serverQueue.songs[0].title}**`));
} else if (command === 'list') {
if (!serverQueue) return msg.channel.send('❎ | Im not playing. ');
return msg.channel.send(`
__**Şarkı listesi:**__ \n 
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
\n **Şu anda çalınan:** ${serverQueue.songs[0].title}
`);
} else if (command === 'stop') {
if (!msg.guild) {
const ozelmesajuyari = new Discord.RichEmbed()
.setDescription(`You can not use commands here.`)
return msg.author.sendEmbed(ozelmesajuyari); }
if (serverQueue && serverQueue.playing) {
serverQueue.playing = false;
serverQueue.connection.dispatcher.pause();
return msg.channel.sendEmbed(new Discord.RichEmbed()
.setDescription('⏸ | Müzik durduruldu.')
.setColor('32363E'));
}
return msg.channel.send('🚫 | Im not playing.');
} else if (command === 'continue') {
if (!msg.guild) {
const ozelmesajuyari = new Discord.RichEmbed()
.setDescription(`You can not use commands here.`)
return msg.author.sendEmbed(ozelmesajuyari); }
if (serverQueue && !serverQueue.playing) {
serverQueue.playing = true;
serverQueue.connection.dispatcher.resume();
return msg.channel.sendEmbed(new Discord.RichEmbed()
.setColor('32363E')
.setDescription('▶ | Müzik devam ettirildi!'));
}
return msg.channel.send('❎ | Im not playing.');
}

return undefined;
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
const serverQueue = queue.get(msg.guild.id);
console.log(video);
const song = {
id: video.id,
title: video.title, 
url: `https://www.youtube.com/watch?v=${video.id}`
};
if (!serverQueue) {
const queueConstruct = {
textChannel: msg.channel,
voiceChannel: voiceChannel,
connection: null,
songs: [],
volume: 5,
playing: true
};
queue.set(msg.guild.id, queueConstruct);

queueConstruct.songs.push(song);

try {
var connection = await voiceChannel.join();
queueConstruct.connection = connection;
play(msg.guild, queueConstruct.songs[0]);
} catch (error) {
console.error(`I could not join the voice channel: ${error}`);
queue.delete(msg.guild.id);
return msg.channel.send(`I could not join the voice channel: ${error}`);
}
} else {
serverQueue.songs.push(song);
console.log(serverQueue.songs);
if (playlist) return undefined;
else return msg.channel.sendEmbed(new Discord.RichEmbed()
.setDescription(`✔ | **${song.title}** successful.`)
.setColor('32363E'));
}
return undefined;
}


function play(guild, song) {
const serverQueue = queue.get(guild.id);

if (!song) {
serverQueue.voiceChannel.leave();
queue.delete(guild.id);
return;
}
console.log(serverQueue.songs);

const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
.on('end', reason => {
if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
else console.log(reason);
serverQueue.songs.shift();
play(guild, serverQueue.songs[0]);
})
.on('error', error => console.error(error));
dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

serverQueue.textChannel.sendEmbed(new Discord.RichEmbed()
.setAuthor(`Şarkı başlatıldı`, `https://images.vexels.com/media/users/3/137425/isolated/preview/f2ea1ded4d037633f687ee389a571086-youtube-icon-logo-by-vexels.png`)
.setDescription(`🎶 Şarkı adı: **${song.title}**`)
.setColor('32363E'));
}


client.on('message', (message) => {
if (message.content.toLowerCase() === ayarlar.prefix + 'gir') {
if (!message.guild) {
const ozelmesajuyari = new Discord.RichEmbed()
.setDescription(`You can not use commands here.`)
return message.author.sendEmbed(ozelmesajuyari); }
try 
{
message.member.voiceChannel.join();
return message.channel.sendEmbed(new Discord.RichEmbed()
.setDescription(' Başarıyla ➢**' + message.member.voiceChannel+ '** adlı kanala giriş yaptım. ')
.setColor('32363E'));
}
catch(e) 
{
return message.channel.sendEmbed(new Discord.RichEmbed()
.setDescription('❎ | Lütfen öncelikle sesli bir kanala katılınız.')
.setColor('32363E'));
}
}

if (message.content.toLocaleLowerCase() === ayarlar.prefix + 'kapat') {
if (!message.guild) {
const ozelmesajuyari = new Discord.RichEmbed()
.setDescription(`You can not use commands here.`)
return message.author.sendEmbed(ozelmesajuyari); }
try
{
message.member.voiceChannel.leave();
return message.channel.sendEmbed(new Discord.RichEmbed()
.setDescription(' Başarıyla ➢**' + message.member.voiceChannel+ '** adlı kanaldan çıkış yaptım.')
.setColor('32363E'));
}
catch(e) 
{
return message.channel.sendEmbed(new Discord.RichEmbed()
.setDescription('<:uyari:405162608631480320> | Lütfen öncelikle sesli bir kanala katılınız.')
.setColor('32363E'));
}
}
if (message.content.toLowerCase() === ayarlar.prefix + 'kanal bilgi' ) {
if (!message.guild) {
const ozelmesajuyari = new Discord.RichEmbed()
.setDescription(`You can not use commands here.`)
return message.author.sendEmbed(ozelmesajuyari); }
try 
{
message.channel.sendEmbed(new Discord.RichEmbed().addField(' __Sesli kanal bilgileri__', ` **•** kanal ismi: **${message.member.voiceChannel.name}** \n **•** MAX kullanıcı sayısı: **${message.member.voiceChannel.userLimit}** \n **•** Bit hızı: **${message.member.voiceChannel.bitrate}** \n **•** kanal ID: **${message.member.voiceChannelID} ** \n **•** Kanal pozisyonu **${message.member.voiceChannel.position}**`).setColor('32363E'));
}
catch(e)
{
message.channel.sendEmbed(new Discord.RichEmbed()
.setDescription('❎ | Lütfen öncelikle sesli bir kanala katılınız.')
.setColor('32363E'));
};
}           
});
var regToken = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;
// client.on('debug', e => {
//   console.log(chalk.bgBlue.green(e.replace(regToken, 'that was redacted')));
// });

client.on('warn', e => {
  console.log(chalk.bgYellow(e.replace(regToken, 'that was redacted')));
});

client.on('error', e => {
  console.log(chalk.bgRed(e.replace(regToken, 'that was redacted')));
});

client.login(ayarlar.token);
