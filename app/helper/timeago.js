// function timeSince(date) {

//     var seconds = Math.floor((Date.now() - date) / 1000);

//     var interval = Math.floor(seconds / 31536000);

//     if (interval > 1) {
//       return interval + " years";
//     }
//     interval = Math.floor(seconds / 2592000);
//     if (interval > 1) {
//       return interval + " months";
//     }
//     interval = Math.floor(seconds / 86400);
//     if (interval > 1) {
//       return interval + " days";
//     }
//     interval = Math.floor(seconds / 3600);
//     if (interval > 1) {
//       return interval + " hours";
//     }
//     interval = Math.floor(seconds / 60);
//     if (interval > 1) {
//       return interval + " minutes";
//     }
//     return Math.floor(seconds) + " seconds";
//   }


function timeSince(timeStamp) {
  timeStamp = timeStamp.toString();
  secondsPast = Math.floor((Date.now() - timeStamp) / 1000);
  if (secondsPast < 60) {
    return Math.floor(parseInt(secondsPast)) + ' sec ago';
  }
  if (secondsPast < 3600) {
    return Math.floor(parseInt(secondsPast / 60)) + ' min ago';
  }
  if (secondsPast < 86400) {
    return Math.floor(parseInt(secondsPast / 3600)) + ' hours ago';
  }
  if (secondsPast < 2592000) {
    return Math.floor(parseInt(secondsPast / 86400)) + ' days ago';
  }
  if (secondsPast <= 31536000) {
    return Math.floor(parseInt(secondsPast / 2592000)) + ' months ago';
  }
  if (secondsPast > 31536000) {
    day = timeStamp.getDate();
    month = timeStamp.toDateString().match(/ [a-zA-Z]*/)[0].replace(" ", "");
    year = timeStamp.getFullYear() == now.getFullYear() ? "" : " " + timeStamp.getFullYear();
    return day + " " + month + year;
  }
}

module.exports = {
  timeSince,
};