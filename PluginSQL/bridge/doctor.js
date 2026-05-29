const http = require("http")

const url = "http://127.0.0.1:34872/health"

http
  .get(url, (response) => {
    let body = ""

    response.on("data", (chunk) => {
      body += chunk
    })

    response.on("end", () => {
      try {
        const health = JSON.parse(body)
        const isCurrent =
          health.capabilities?.sessionCommands === true &&
          health.capabilities?.sessionResults === true

        if (isCurrent) {
          console.log("RSQL bridge is current.")
          console.log(JSON.stringify(health, null, 2))
          return
        }

        console.error("RSQL bridge is running, but it is outdated.")
        console.error("Stop the Node process on port 34872, then run npm.cmd run dev again.")
        console.error(JSON.stringify(health, null, 2))
        process.exitCode = 1
      } catch {
        console.error("Port 34872 responded, but not with valid JSON.")
        console.error(body)
        process.exitCode = 1
      }
    })
  })
  .on("error", (error) => {
    console.error(`RSQL bridge is not reachable: ${error.message}`)
    process.exitCode = 1
  })
