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
    assert.equal((await simpleStore.get.call()).toNumber(), newValue)
  })
})
