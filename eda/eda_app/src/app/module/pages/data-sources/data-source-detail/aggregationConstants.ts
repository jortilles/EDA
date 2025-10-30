export const AGG_COMPUTED = {

    AGG_TEXT:
        [
            "count",
            "count_distinct",
            "none"
        ],
    AGG_NUMERIC: 
        [
            "sum", 
            "avg",
            "max",
            "min",
            "count",
            "count_distinct",
            "none"
        ],
    AGG_DATE: 
        [
            "count",
            "count_distinct",
            "none"
        ],
    AGG_COORDINATE: 
        [
            "none"
        ],
    AGG_TEXT_VALUE_DISPLAY: 
    [
        { "value": "count", "display_name": "Count Values" },
        { "value": "count_distinct", "display_name": "Distinct Values" },
        { "value": "none", "display_name": "None" }
    ],
    AGG_NUMERIC_VALUE_DISPLAY: 
    [
        { "value": "sum", "display_name": "Sum" },
        { "value": "avg", "display_name": "Average" },
        { "value": "max", "display_name": "Maximum" },
        { "value": "min", "display_name": "Minimum"},
        { "value": "count", "display_name": "Count Values" },
        { "value": "count_distinct", "display_name": "Distinct Values" },
        { "value": "none", "display_name": "None" }
    ],
    AGG_DATE_VALUE_DISPLAY: 
    [
        { "value": "count", "display_name": "Count Values" },
        { "value": "count_distinct", "display_name": "Distinct Values" },
        { "value": "none", "display_name": "None" }
    ],
    AGG_COORDINATE_VALUE_DISPLAY: 
    [
        { "value": "none", "display_name": "None" }
    ],

};