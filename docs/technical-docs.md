# Technical Documentation

## DASHBOARD GLOBAL FILTER BY URL PARAMS

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
www.eda.jortilles.com/dashboard/dashboard_id?table_name.column_name=value1|value2

#table_name = "customers"
#column_name = "sale_date"
#value1 = "2020-01-01" #!important dates with "-"
#value2 = "2020-12-31" #!important dates with "-"

# Real example:
www.eda.jortilles.com/dashboard/dashboard_id?customers.sale_date=2020-01-01|2020-12-31
```