# Technical Documentation

If you are on this page, we understand that you know what you are doing and you have programming knowledge.

## Native SQL queries

### General information

You can make SQL queries about the schema defined in your model. To do this, enter the query in the text box and select the source table (it can be any of those that appear in the query). We will use this table to link the query to the report filters.

Limitations:

* It is only possible to use the tables of the schema defined in the model (if any).
* Please use aliases for all tables in the query.

### Link query with panel filters

You can link the report filters with the query

* Just add: "AND ${table_alias.filtered_column}" in the "WHERE" clause of the query where you want to inject the filter.
* If you haven't added a "WHERE" clause, add it to the query, along with the filter in the format "${table_alias.column_filtered}".
* If the table we filter by is not in the query, remember that you must add the necessary "JOIN" clauses to be able to link the filter table with your query.

### Examples

**Simple query**

```
SELECT c.customername FROM CUSTOMERS c
```

**Query with linked report filters**

We have a filter in the report for the "CITY" field of the "CUSTOMERS" table.

* Query without linked filters

```
SELECT c.customername FROM CUSTOMERS c WHERE c.customername IN ('Julia', 'John')
```

* Query with linked filters

```
SELECT c.customername FROM CUSTOMERS c WHERE c.customername IN ('Julia', 'john') AND ${c.city}
```

We have a filter in the report for the "OFFICE_ID" field of the "OFFICES" table.

* Query without linked filters

```
SELECT e.employee_name FROM EMPLOYEE e WHERE e.employee_name IN ('Julia', 'John')
```

* Query with linked filters

```
SELECT e.employee_name FROM EMPLOYEE e

INNER JOIN OFFICES o ON o.office_id = e.office_id

WHERE e.employee_name IN ('Julia', 'John') AND ${o.office_id}
```

## Report global filter by url params

If you need to pass a string or number value for a global filter through the url. You have to do it like this.

```
www.eda.jortilles.com/dashboard/dashboard_id?table_name.column_name=value

#table_name = "customers"
#column_name = "customer_id"
#value = 1

# Real example:
www.eda.jortilles.com/dashboard/dashboard_id?customers.customer_id=1

# If you want to pass more than one value you can do it with "|".

www.eda.jortilles.com/dashboard/dashboard_id?table_name.column_name=value1|value2|value3

```

If you have a date range global filter you have to pass the value with this format.

```
www.eda.jortilles.com/dashboard/dashboard_id?table_name.column_name=date1|date2

#table_name = "customers"
#column_name = "sale_date"
#date1 = "2020-01-01" #!important dates with "-"
#date2 = "2020-12-31" #!important dates with "-"

# Real example:
www.eda.jortilles.com/dashboard/dashboard_id?customers.sale_date=2020-01-01|2020-12-31
```



## Oracle Connectivity

If you want to connect to an oracle database you need to have installed Oracle Instant client 
For windows: https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html
For Linux: https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html
For more detailed instructions see: https://oracle.github.io/node-oracledb/doc/api.html#usermanual

Once you have installed the instant client. You need to set the installation path in EDA_API/config/oracle-config.js
