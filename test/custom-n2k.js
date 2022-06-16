const N2kMapper = require('@signalk/n2k-signalk').N2kMapper
const EventEmitter = require('events')
const signalkSchema = require('@signalk/signalk-schema')
const PropertyValues =  require('@signalk/server-api').PropertyValues

var chai = require('chai')
chai.Should()
chai.use(require('chai-things'))
chai.use(require('@signalk/signalk-schema').chaiModule)

const mappings = require('../n2k-signalk')

describe('custom pgns', function () {
  it('custom fulid pgn works', function () {
    const propertyValues = new PropertyValues();

    propertyValues.emitPropertyValue({
      timestamp: Date.now(),
      setter: 'customPgns',
      name: 'pgn-to-signalk',
      value: mappings
    })
    
    const n2kMapper = new N2kMapper({ onPropertyValues: propertyValues.onPropertyValues.bind(propertyValues) })
   
    var delta = n2kMapper.toDelta(JSON.parse(
      '{"timestamp":"2018-04-02T16:15:44.125Z", "prio":7, "src":113, "dst":255, "pgn":65280, "description":"EmpirBus Switch Bank Status", "fields":{"Dimmer1": 0, "Dimmer2": 500, "Indicator1": "Off", "Indicator2": "On", "Indicator3": "Off",  "Indicator4": "Off", "Indicator5": "On", "Indicator6": "Off", "Indicator7": "Off", "Indicator8": "Off", "Industry Code": "Marine Industry", "Instance": 1, "Manufacturer Code": "Empir Bus" }}'
    ))
    delta.context = 'vessels.' + signalkSchema.fakeMmsiId
    var contextParts = delta.context.split('.')
    var tree = signalkSchema.deltaToFull(delta)[contextParts[0]][contextParts[1]]

    tree.should.have.nested.property('electrical.switches.empirBusNxt-instance1-switch5.state.value', true)
    tree.should.have.nested.property('electrical.switches.empirBusNxt-instance1-switch4.state.value', false)
    tree.should.have.nested.property('electrical.switches.empirBusNxt-instance1-dimmer2.dimmingLevel.value', 0.5)
    tree.should.have.nested.property('electrical.switches.empirBusNxt-instance1-dimmer2.state.value', true)
    tree.should.have.nested.property('electrical.switches.empirBusNxt-instance1-dimmer1.dimmingLevel.value', 0)
    tree.should.have.nested.property('electrical.switches.empirBusNxt-instance1-dimmer1.state.value', false)
  })
})
