## Start MySQL

Bind Target Server to port 4441;
```bash
docker-compose -f docker-compose.yml up -d 
```

## Start Proximux

Setup in proxy mode
```bash
export LOG_LEVEL=3
export LOCAL_HOST=localhost
export LOCAL_PORT=3307
export LOCAL_MAX_CONNECTIONS=2
export PROXY_CONNECTIONS_CNT=2
export PROXY_INACTIVE_TIMEOUT=30000
export TARGET_HOST_1=localhost
export TARGET_PORT_1=4441
export TARGET_CONN_1_KEEP_ALIVE=0
export TARGET_HOST_2=localhost
export TARGET_PORT_2=4441
export TARGET_CONN_2_KEEP_ALIVE=0
```

Start service
```bash
npx ts-node -T app.ts
```

## Test connection

```php
$mysqli = new mysqli("localhost:3307", "root", "Aaaa1234my-secret-pw", "proximux");
var_dump($mysqli->query("SHOW TABLES")->fetch_all());
var_dump($mysqli->query("SELECT SLEEP(10)")->fetch_all());
$mysqli->close();
```
