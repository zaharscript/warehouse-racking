function onScanSuccess(decodedText, decodedResult) {
    // console.log(`Code scanned: ${decodedText}`, decodedResult);
    // document.getElementById("output").innerHTML = `Scanned: ${decodedText}`;
    document.getElementById("itemId").value = `${decodedText}`;
}

function openScanner() {
  var html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start(
      { facingMode: "environment" }, // or `user` for front camera
      {
          fps: 10,    // Optional, frame per second for qr code scanning
          qrbox: 250  // Optional, size of scan box
      },
      onScanSuccess
  );
}