// const startButton = parent.document.querySelector('[data-qa="start-challenge-button"]');
// console.log(parent.document)
// console.log("parent:",startButton);
// // startButton.setAttribute("disabled", "true");
// // startButton.style.backgroundColor="black"; 
// console.log("hello from panel");
// console.log(document)
// chrome.runtime.onMessage.addListener(
//   function(request, sender, sendResponse) {
//     console.log('in panel');
//     console.log(sender.tab ?
//                 "from a content script:" + sender.tab.url :
//                 "from the extension");
//     if (request.greeting === "hello")
//       sendResponse({farewell: "goodbye"});
//   }
// );
// chrome.runtime.sendMessage({ greeting: "hello from panel" }, function (response) {
//   console.log(response.farewell);
// });

// var port = chrome.runtime.connect({ name: "content" });
// port.postMessage({ joke: "Knock knock2" });
// port.onMessage.addListener(function (msg) {
//     console.log("panel",msg);
//     if (msg.question === "Who's there?2")
//         port.postMessage({ answer: "Madame2" });
//     else if (msg.question === "Madame who?2")
//         port.postMessage({ answer: "Madame... Bovary2" });
//     return true
// });

// chrome.runtime.onConnect.addListener(function (port) {
//   console.log("listening in panel", port);
//   console.assert(port === "panel");
//   port.onMessage.addListener(function (msg) {
//     console.log("received at panel", msg); 
//   });
// });