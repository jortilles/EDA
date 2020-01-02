const DataSource = require('../../models/global/data-source-model');
const Dashboard = require('../../models/dashboard/dashboard-model');
const ERROR = require('../../models/error-model/error-model');

exports.getDataSources = (req, res) => {

    DataSource.find({}, (err, dataSource) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                message: 'Error loading Data Sources',
                errors: err
            });
        }

        res.status(200).json({
            ok: true,
            ds: dataSource
        });

    });
};

exports.getNamesDataSources = (req, res) => {
    DataSource.find({}, (err, dataSource) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                message: 'Error loading Data Sources',
                errors: err
            });
        }

        const names = JSON.parse(JSON.stringify(dataSource));

        const output = [];
        names.forEach(e => {
            output.push({ _id: e._id, model_name: e.ds.metadata.model_name })
        });

        return res.status(200).json({
            ok: true,
            ds: output
        });

    });
};

exports.createDataSource = async (data_source) => {
    // Create a datamodel
    const dataSource = new DataSource({
        ds: data_source,
        //user: '',
    });
    //Save datamodel in db
    const out =  await dataSource.save();
    return out;
};

exports.getDataSourceById = (req, res) => {
    DataSource.findById({ _id: req.params.id }, (err, dataSource) => {
        if (err) {
            return res.status(500).send(
                new ERROR(false, `Datasouce not found with id ${req.params.id}`, err)
            );
        }
        res.status(200).json({
            ok: true,
            dataSource
        });
    })
}

exports.updateDataSource = (req, res) => {
    // Validation request
    const body = req.body;

    DataSource.findById(req.params.id, (err, dataSource) => {

        if (err) {
            return res.status(500).send(
                new ERROR(false, 'DataSource not found', err)
            );
        }

        if (!dataSource) {
            return res.status(400).send(
                new ERROR(false, `DataSource not exist with id ${req.params.id}`, err)
            );
        }

        dataSource.ds = body.ds;
        dataSource.save((err, dataSource) => {

            if (err) {
                return res.status(400).json(
                    new ERROR(false, 'Error updating dataSource', err)
                );
            }

            return res.status(200).json({
                ok: true,
                message: 'Modelo actualizado correctamente'
            });

        })

    });
};
exports.deleteDataSource = (req, res) => {
    Dashboard.find({}, (err, dashboards) => {
        const dbds = dashboards.filter(d => d.config.ds._id === req.params.id);
        let stopLoop = false;
        for (let i = 0; i < dbds.length; i++) {
            if (stopLoop) {
                return false;
            }
            Dashboard.findByIdAndDelete(dbds[i]._id, (err, dashboard) => {
                if (err) {
                    stopLoop = true;
                    return res.status(500).send(
                        new ERROR(false, 'Error removing dashboard', err)
                    );
                }
            });
        }
        DataSource.findByIdAndDelete(req.params.id, (err, dataSource) => {
            if (err) {
                return res.status(500).send(
                    new ERROR(false, 'Error removing dataSource', err)
                );
            }

            return res.status(200).json({
                ok: true,
                dataSource
            });
        });
    });

}

