const chai = require('chai')
chai.Should()
chai.use(require('chai-things'))
chai.use(require('chai-json-equal'));

const { FromPgn, pgnToActisenseSerialFormat } = require('@canboat/canboatjs')
const PropertyValues =  require('@signalk/server-api').PropertyValues

const definitions = require('../pgns.json')

describe('custom pgns', function () {

  const propertyValues = new PropertyValues();

  propertyValues.emitPropertyValue({
    timestamp: Date.now(),
    setter: 'customPgns',
    name: 'canboat-custom-pgns',
    value: definitions
  })
  
  var fromPgn = new FromPgn({
    onPropertyValues: (name, cb) => {
      propertyValues.onPropertyValues(name, cb)
    }
  })

  it(`custom pgn in`, function (done) {
    try {
      let pgn = fromPgn.parseString(input)
      delete pgn.input
      pgn.should.jsonEqual(expected)
      done()
    } catch ( e ) {
      done(e)
    }
  })

  it(`custom pgn out`, function (done) {

    var actisense = pgnToActisenseSerialFormat(expected)
    actisense = actisense.slice(actisense.indexOf(','))
    actisense.should.equal(',2,65280,0,255,8,30,99,01,00,00,f0,ff,ff')
    done()
  })
})


const input = "2018-04-02T16:15:44.125Z,7,65280,113,255,8,30,99,01,00,00,00,00,00"
var expected = {
  "timestamp":"2018-04-02T16:15:44.125Z",
  "prio":7,
  "src":113,
  "dst":255,
  "pgn":65280,
  "description":"EmpirBus Switch Bank Status",
  "fields":{
    "Dimmer1": 0,
    "Dimmer2": 0,
    "Indicator1": "Off",
    "Indicator2": "Off",
    "Indicator3": "Off",
    "Indicator4": "Off",
    "Indicator5": "Off",
    "Indicator6": "Off",
    "Indicator7": "Off",
    "Indicator8": "Off",
    "Industry Code": "Marine Industry",
    "Instance": 1,
    "Manufacturer Code": "Empir Bus"
  }
}
