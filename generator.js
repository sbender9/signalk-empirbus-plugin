
const plugin = require('./index')()

const state = {
  dimmers: {
    "0": {
      "state": {
        "value": 0.5
      }
    },
    "1": {
      "state": {
        "value": 1
      }
    }
  },
  "switches": {
    "0": {
      "state": {
        "value": "on"
      }
    },
    "1": {
      "state": {
        "value": "off"
      }
    },
    "2": {
      "state": {
        "value": "on"
      }
    },
    "3": {
      "state": {
        "value": "off"
      }
    },
    "4": {
      "state": {
        "value": "on"
      }
    },
    "5": {
      "state": {
        "value": "off"
      }
    },
    "6": {
      "state": {
        "value": "on"
      }
    },
    "7": {
      "state": {
        "value": "off"
      }
    },
  }
}


const instance = 0

console.log(plugin.generateStatePGN(instance, state))
state.dimmers['0'].state.value = 1
console.log(plugin.generateStatePGN(instance, state))
state.switches['7'].state.value = 'on'
console.log(plugin.generateStatePGN(instance, state))
