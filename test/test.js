const assert = require('assert')
const EventEmitter = require('events')
const _ = require('lodash')
const chai = require('chai')

chai.Should()
chai.use(require('chai-json-equal'))

function createApp() {
  const app = new EventEmitter()
  app.handlers = []

  app.debug = () => {}
  app.setPluginStatus = () => {}
  app.setPluginError = () => {}
  app.registerActionHandler = (context, path, handler) => {
    app.handlers.push({ context, path, handler })
  }
  app.handleMessage = (id, delta) => {
    app.lastMessage = { id, delta }
  }

  return app
}

describe('EmpirBus PGN 65280 handling', () => {
  it('creates the expected delta from a decoded buffer', () => {
    const app = createApp()
    const plugin = require('../index')(app)

    const state = plugin.readDataBuffer(Buffer.from([0x00, 0xf4, 0x01, 0xe8, 0x03, 0x55]))
    const delta = plugin.createDelta(state)

    toFlat(delta).should.jsonEqual(expectedFlat)
  })

  it('emits state from YD raw canboatjs output fallback', () => {
    const app = createApp()
    const plugin = require('../index')(app)

    plugin.start({})

    app.emit('canboatjs:rawoutput', '2026-04-24T15:00:00.000Z 2 1CFF000B 30 99 01 F4 01 E8 03 55')

    assert.ok(app.lastMessage, 'no delta emitted from raw fallback')
    toFlat(app.lastMessage.delta).should.jsonEqual(expectedFlat)

    plugin.stop()
  })

  it('serializes state to actisense format', () => {
    const app = createApp()
    const plugin = require('../index')(app)
    const state = {
      dimmers: [500, 1000],
      lastDimmingLevels: [1000, 1000],
      switches: [1, 0, 1, 0, 1, 0, 1, 0]
    }

    const actisense = plugin.generateStatePGN(0, state)

    actisense.substr(25).should.equal('2,65280,0,255,8,30,99,00,f4,01,e8,03,55')
  })

  it('returns a clear error when PUT arrives before instance state is cached', () => {
    const app = createApp()
    const plugin = require('../index')(app)

    plugin.createDelta(plugin.readDataBuffer(Buffer.from([0x00, 0xf4, 0x01, 0xe8, 0x03, 0x55])))

    const handler = app.handlers.find(entry => entry.path === 'electrical.switches.empirBusNxt-instance0-dimmer1.state')

    assert.ok(handler, 'no action handler registered')

    const result = handler.handler('vessels.self', handler.path, true)

    result.statusCode.should.equal(503)
    result.message.should.equal('No current state cached for EmpirBus instance 0. Wait for a PGN 65280 status update before sending PUT requests.')
  })
})

const expectedFlat = {
  electrical: {
    switches: {
      'empirBusNxt-instance0-dimmer1': {
        state: true,
        dimmingLevel: 0.5,
        type: 'dimmer'
      },
      'empirBusNxt-instance0-dimmer2': {
        state: false,
        dimmingLevel: 1,
        type: 'dimmer'
      },
      'empirBusNxt-instance0-switch3': {
        state: true,
        type: 'switch'
      },
      'empirBusNxt-instance0-switch4': {
        state: false,
        type: 'switch'
      },
      'empirBusNxt-instance0-switch5': {
        state: true,
        type: 'switch'
      },
      'empirBusNxt-instance0-switch6': {
        state: false,
        type: 'switch'
      },
      'empirBusNxt-instance0-switch7': {
        state: true,
        type: 'switch'
      },
      'empirBusNxt-instance0-switch8': {
        state: false,
        type: 'switch'
      }
    }
  }
}

_.set(expectedFlat, 'electrical.switches.empirBusNxt-instance0-dimmer1.state.meta', {
  units: 'bool',
  displayName: 'Dimmer 0.1',
  associatedDevice: { instance: 0, device: 'dimmer 1' }
})
_.set(expectedFlat, 'electrical.switches.empirBusNxt-instance0-dimmer1.dimmingLevel.meta', {
  units: 'ratio',
  description: 'Dimmer brightness ratio, 0<=ratio<=1, 1 is 100%',
  displayName: 'Dimmer 0.1 brightness',
  associatedDevice: { instance: 0, device: 'dimmer 1' }
})
_.set(expectedFlat, 'electrical.switches.empirBusNxt-instance0-dimmer2.state.meta', {
  units: 'bool',
  displayName: 'Dimmer 0.2',
  associatedDevice: { instance: 0, device: 'dimmer 2' }
})
_.set(expectedFlat, 'electrical.switches.empirBusNxt-instance0-dimmer2.dimmingLevel.meta', {
  units: 'ratio',
  description: 'Dimmer brightness ratio, 0<=ratio<=1, 1 is 100%',
  displayName: 'Dimmer 0.2 brightness',
  associatedDevice: { instance: 0, device: 'dimmer 2' }
})
_.set(expectedFlat, 'electrical.switches.empirBusNxt-instance0-switch3.state.meta', {
  units: 'bool',
  displayName: 'Switch 0.3',
  associatedDevice: { instance: 0, device: 'switch 3' }
})
_.set(expectedFlat, 'electrical.switches.empirBusNxt-instance0-switch4.state.meta', {
  units: 'bool',
  displayName: 'Switch 0.4',
  associatedDevice: { instance: 0, device: 'switch 4' }
})
_.set(expectedFlat, 'electrical.switches.empirBusNxt-instance0-switch5.state.meta', {
  units: 'bool',
  displayName: 'Switch 0.5',
  associatedDevice: { instance: 0, device: 'switch 5' }
})
_.set(expectedFlat, 'electrical.switches.empirBusNxt-instance0-switch6.state.meta', {
  units: 'bool',
  displayName: 'Switch 0.6',
  associatedDevice: { instance: 0, device: 'switch 6' }
})
_.set(expectedFlat, 'electrical.switches.empirBusNxt-instance0-switch7.state.meta', {
  units: 'bool',
  displayName: 'Switch 0.7',
  associatedDevice: { instance: 0, device: 'switch 7' }
})
_.set(expectedFlat, 'electrical.switches.empirBusNxt-instance0-switch8.state.meta', {
  units: 'bool',
  displayName: 'Switch 0.8',
  associatedDevice: { instance: 0, device: 'switch 8' }
})

function toFlat(delta) {
  const res = {}

  delta.updates.forEach(update => {
    update.values.forEach(pathValue => {
      _.set(res, pathValue.path, pathValue.value)
    })

    ;(update.meta || []).forEach(pathValue => {
      _.set(res, `${pathValue.path}.meta`, pathValue.value)
    })
  })

  return res
}
