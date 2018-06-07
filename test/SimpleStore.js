const SimpleStore = artifacts.require('SimpleStore');

contract('SimpleStore', (accounts) => {
  let simpleStore

  beforeEach(async () => {
    simpleStore = await SimpleStore.new()
  })

  it('Should have an address for SimpleStore', async () => {
    assert(simpleStore.address)
  });

  it('Should set a value', async () => {
    const newValue = 1
    const tx = await simpleStore.set(newValue, {from: accounts[0]})
    assert.equal(tx.logs[0].args._value.toNumber(), newValue)

    const result = await simpleStore.get.call({from: accounts[1]})
    assert.equal(result[0], newValue)
    assert.equal(result[1], accounts[1])
  })
})
