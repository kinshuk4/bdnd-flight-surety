## Project Submission
Please read [README](./README.md). This is the skimmed version of readme.

### Compiling the contract

If you have not installed packages, please use `make install`.

To compile:
```bash
truffle compile
```
OR
```bash
make compile
```

### Start Ganache GUI and Migrate Contract
```bash
make migrate
```

If you see any issues, please run following:
```bash
make clean
```
and retry `make migrate`.

### Run the tests
```
truffle test ./test/testFileName.js

```
OR 
```bash
make test
```

### Run the client
```bash
npm run dapp
```

OR 
```bash
make run_dapp
```

### Start the server
```bash
npm run server
```

OR 
```nashorn js
make run_server
```

## To run all
To run all:
```bash
make run all
```