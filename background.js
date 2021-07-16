

// chrome.runtime.onConnect.addListener(function (port) {
//   // console.assert(port.name === "content");
//   if (port.name === "content") {
//     port.onMessage.addListener(function (msg) {
//       console.log("background1", msg);
//       if (msg.joke === "Knock knock")
//         port.postMessage({ question: "Who's there?" });
//       else if (msg.answer === "Madame")
//         port.postMessage({ question: "Madame who?" });
//       else if (msg.answer === "Madame... Bovary")
//         port.postMessage({ question: "I don't get it." });
//     });
//   } else if (port.name === "panel") {
//     port.onMessage.addListener(function (msg) {
//       console.log("background2", msg);
//       if (msg.joke === "Knock knock2")
//         port.postMessage({ question: "Who's there?2" });
//       else if (msg.answer === "Madame2")
//         port.postMessage({ question: "Madame who?2" });
//       else if (msg.answer === "Madame... Bovary2")
//         port.postMessage({ question: "I don't get it." });
//     });
//   }
//   return true
// });

// chrome.runtime.onConnect.addListener(function (port) {
//   console.log("connected to content0");
//   // console.assert(port.name === "content");
//   if (port.name === "content") {
//       console.log("connected to content");
//   }
//   return true;
// });