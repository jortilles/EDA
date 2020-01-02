const Dashboard = require('../../models/dashboard/dashboard-model');
const Datasource = require('../../models/global/data-source-model');
const ERROR = require('../../models/error-model/error-model');

// Retrieve and return all dashboards from the database.sa
exports.findAll = (req, res) => {
    Dashboard.find({ }, ( err, dashboard ) => {
        if ( err ) {
            return res.status(500).send( 
                new ERROR( false, 'Error loading dashboards', err )
            );
        }

        res.status(200).json({
            ok: true,
            dashboard
        });
    });
};

// Find a single dashboard with a dashboardId
exports.findOne = (req, res) => {
    Dashboard.findOne({ _id: req.params.id }, (err, dashboard) => {

        if ( err ) {
            return res.status(500).send(
                new ERROR( false, `Dashboard not found with id ${req.params.id}`, err )
            );
        }

        Datasource.findById({ _id: dashboard.config.ds._id }, (err, datasource) => {
            if ( err ) {
                return res.status(500).send(
                    new ERROR( false, `Datasouce not found with id ${dashboard.ds._id}`, err )
                );
            }
            
            const toJson = JSON.parse(JSON.stringify(datasource));
            const ds = { _id: datasource._id, model: toJson.ds.model};

            res.status(200).json({
                ok: true,
                dashboard,
                datasource: ds
            });

        });
    })

};

// Create and Save a new dashboard
exports.create = (req, res) => {
    var body = req.body;

    // Create a dashboard
    const dashboard = new Dashboard({
        config: body.config,
        user: req.user._id,
    });

    //Save dashboard in db
    dashboard.save(( err, dashboard ) => {

        if ( err ) {
            
            return res.status(400).send(                
                new ERROR( false, 'Some error ocurred while creating the dashboard', err )
            );
        }

        res.status(201).json({
            ok: true,
            dashboard,
        });

    });
};

// Update a dashboard identified by the dashboardId in the request
exports.update = (req, res) => {
    // Validation request

    const body = req.body;

    Dashboard.findById(req.params.id, ( err, dashboard ) => {

        if ( err ) {
            return res.status(500).send(
                new ERROR( false, 'Dashboard not found', err )
            );
        }

        if ( !dashboard ) {
            return res.status(400).send(
                new ERROR( false, `Dashboard not exist with id ${req.params.id}`, err )
            );
        }

        dashboard.config = body.config;

        dashboard.save(( err, dashboard ) => {

            if ( err ) {
                return res.status(400).json(
                    new ERROR( false, 'Error updating dashboard', err )
                );
            }

            return res.status(200).json({
                ok: true,
                dashboard
            });

        })

    });
};

// Delete a dashboard with the specified dashboardId in the request
exports.delete = (req, res) => {
    Dashboard.findByIdAndDelete(req.params.id, ( err, dashboard ) => {

        if ( err ) {
            return res.status(500).send(
                new ERROR( false, 'Error removing dashboard', err )
            );
        }

        if ( !dashboard ) {
            return res.status(400).json(
                new ERROR( false, 'Not exists dahsboard with this id', err )
            );
        }

         return res.status(200).json({
            ok: true,
            dashboard
        });
    });
};