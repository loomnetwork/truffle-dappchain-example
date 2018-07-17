import React from 'react'
import ReactDOM from 'react-dom'
import Contract from './contract'

const Index = class Index extends React.Component {
  constructor(props) {
    super(props)

    this.contract = new Contract()
    this.value = 0

    this.state = {
      value: 0,
      isValid: false,
      tx: null
    }
  }

  async componentWillMount() {
    await this.contract.loadContract()
    this.contract.addEventListener((v) => {
      this.setState({ value: v._value })
    })
  }

  onChangeHandler(event) {
    this.value = event.target.value
    const isValid = this.value > 0
    this.setState({ isValid })
  }

  async confirmValue() {
    const tx = await this.contract.setValue(this.value)
    this.setState({ tx })
  }

  render() {
    return (
      <div className="container" style={{ marginTop: 10 }}>
        <form>
          <div className="form-group">
            <label>Value</label>
            <input type="number" className="form-control" onChange={(event) => this.onChangeHandler(event)} />
            <small className="form-text text-muted">Set a number</small>
          </div>
          <button type="button" disabled={!this.state.isValid} className="btn btn-primary" onClick={() => this.confirmValue()}>Confirm</button>
        </form>
        <div className="alert alert-success">
          Value set is {this.state.value} (this value only updates if values is 10)
        </div>
        <hr />
        <pre>
          {this.state.tx && JSON.stringify(this.state.tx, null, 2)}
        </pre>
      </div>
    )
  }
}

ReactDOM.render(<Index />, document.getElementById('root'))

