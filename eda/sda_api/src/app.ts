import bodyParser, { json } from 'body-parser';
import express, { application } from 'express';
import router from './routes/routes';


if (process.env.NODE_ENV !== 'production'){
  let longjohn = require('longjohn');
  longjohn.async_trace_limit = -1;
}

const app = express();

const port = 4000;
app.set('views', (`${__dirname}/views`) )

app.use(express.urlencoded({extended:false}))
app.use(express.json())

app.use(router);
app.use('/', router)

app.listen(port, () => {
    
    console.log(`[server]: Server is running at http://localhost:${port}`);
    
  })

 

