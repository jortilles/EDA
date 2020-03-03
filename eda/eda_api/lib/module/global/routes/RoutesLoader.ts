import RoutesAdmin from '../../admin/routes/loader';
import RoutesDashboard from '../../dashboard/routes/loader';
import RoutesDataSource from '../../datasource/routes/loader';
import RoutesUploads from '../../uploads/routes/loader';

function RoutesLoader(app) {
    RoutesAdmin(app, '/admin');
    RoutesDashboard(app, '/dashboard');
    RoutesDataSource(app, '/datasource');
    RoutesUploads(app, '/global/upload')
}

export default RoutesLoader;
