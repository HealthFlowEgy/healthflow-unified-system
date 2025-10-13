import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Business,
  People,
  LocalPharmacy,
  Warning,
  Assessment,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { apiClient } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#9c27b0', '#0288d1'];

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [metrics, setMetrics] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/api/v2/analytics/system?timeRange=${timeRange}`);
      setMetrics(response.data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const calculateChange = (current: number, previous: number): { value: number; isPositive: boolean } => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      isPositive: change >= 0,
    };
  };

  const KPICard = ({ title, value, icon, trend, color }: any) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ mb: 1 }}>
              {formatNumber(value)}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {trend.isPositive ? (
                  <TrendingUp fontSize="small" color="success" />
                ) : (
                  <TrendingDown fontSize="small" color="error" />
                )}
                <Typography
                  variant="body2"
                  color={trend.isPositive ? 'success.main' : 'error.main'}
                >
                  {trend.value.toFixed(1)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: `${color}.lighter`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.cloneElement(icon, { sx: { fontSize: 32, color: `${color}.main` } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading && !metrics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive system analytics and insights
          </Typography>
        </Box>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
            <MenuItem value="90d">Last 90 Days</MenuItem>
            <MenuItem value="1y">Last Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {metrics && (
        <>
          {/* KPI Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Active Tenants"
                value={metrics.overview.totals.active_tenants}
                icon={<Business />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Total Users"
                value={metrics.overview.totals.total_users}
                icon={<People />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Active Medicines"
                value={metrics.overview.totals.active_medicines}
                icon={<LocalPharmacy />}
                color="info"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Active Recalls"
                value={metrics.overview.totals.active_recalls}
                icon={<Warning />}
                color="error"
              />
            </Grid>
          </Grid>

          {/* Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={currentTab}
              onChange={(_, newValue) => setCurrentTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Overview" />
              <Tab label="Tenants" />
              <Tab label="Users" />
              <Tab label="Medicines" />
              <Tab label="Safety" />
              <Tab label="Activity" />
            </Tabs>
          </Paper>

          {/* Overview Tab */}
          <TabPanel value={currentTab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recent Growth
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <Typography color="text.secondary" variant="body2">
                          New Tenants
                        </Typography>
                        <Typography variant="h5">
                          {formatNumber(metrics.overview.growth.new_tenants)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography color="text.secondary" variant="body2">
                          New Users
                        </Typography>
                        <Typography variant="h5">
                          {formatNumber(metrics.overview.growth.new_users)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography color="text.secondary" variant="body2">
                          Adverse Events
                        </Typography>
                        <Typography variant="h5">
                          {formatNumber(metrics.overview.growth.new_adverse_events)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      System Health
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Active Tenants</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {((metrics.overview.totals.active_tenants / 
                             (metrics.overview.totals.active_tenants + 5)) * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                      <Box sx={{ height: 8, bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            width: `${(metrics.overview.totals.active_tenants / 
                                      (metrics.overview.totals.active_tenants + 5)) * 100}%`,
                            height: '100%',
                            bgcolor: 'success.main',
                          }}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tenants Tab */}
          <TabPanel value={currentTab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Tenants by Type
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={Object.entries(metrics.tenants.byType).map(([type, count]) => ({
                              name: type.replace('_', ' '),
                              value: count,
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.keys(metrics.tenants.byType).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Tenants by Status
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer>
                        <BarChart
                          data={Object.entries(metrics.tenants.byStatus).map(([status, count]) => ({
                            status: status.replace('_', ' '),
                            count,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="status" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#1976d2" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Tenant Growth Trend
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer>
                        <LineChart data={metrics.tenants.growth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) => new Date(value).toLocaleDateString()}
                          />
                          <YAxis />
                          <Tooltip
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#1976d2"
                            strokeWidth={2}
                            name="New Tenants"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Users Tab */}
          <TabPanel value={currentTab} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      User Statistics
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography color="text.secondary" variant="body2">
                          Total Users
                        </Typography>
                        <Typography variant="h5">{formatNumber(metrics.users.total)}</Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography color="text.secondary" variant="body2">
                          Active Users
                        </Typography>
                        <Typography variant="h5">{formatNumber(metrics.users.active)}</Typography>
                      </Box>
                      <Box>
                        <Typography color="text.secondary" variant="body2">
                          Activity Rate
                        </Typography>
                        <Typography variant="h5">
                          {((metrics.users.active / metrics.users.total) * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Users by Role
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer>
                        <BarChart
                          data={Object.entries(metrics.users.byRole).map(([role, count]) => ({
                            role,
                            count,
                          }))}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="role" type="category" />
                          <Tooltip />
                          <Bar dataKey="count" fill="#2e7d32" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      User Growth Trend
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer>
                        <LineChart data={metrics.users.growth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) => new Date(value).toLocaleDateString()}
                          />
                          <YAxis />
                          <Tooltip
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#2e7d32"
                            strokeWidth={2}
                            name="New Users"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Medicines Tab */}
          <TabPanel value={currentTab} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Medicine Statistics
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography color="text.secondary" variant="body2">
                          Total Medicines
                        </Typography>
                        <Typography variant="h5">{formatNumber(metrics.medicines.total)}</Typography>
                      </Box>
                      <Box>
                        <Typography color="text.secondary" variant="body2">
                          Recently Added ({timeRange})
                        </Typography>
                        <Typography variant="h5">
                          {formatNumber(metrics.medicines.recentlyAdded)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Medicines by Status
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={Object.entries(metrics.medicines.byStatus).map(([status, count]) => ({
                              name: status,
                              value: count,
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.keys(metrics.medicines.byStatus).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Safety Tab */}
          <TabPanel value={currentTab} index={4}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recall Summary
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography color="text.secondary" variant="body2">
                          Total Recalls
                        </Typography>
                        <Typography variant="h5">{formatNumber(metrics.recalls.total)}</Typography>
                      </Box>
                      <Box>
                        <Typography color="text.secondary" variant="body2">
                          Recent Recalls ({timeRange})
                        </Typography>
                        <Typography variant="h5">{formatNumber(metrics.recalls.recent)}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recalls by Severity
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer>
                        <BarChart
                          data={Object.entries(metrics.recalls.bySeverity).map(([severity, count]) => ({
                            severity,
                            count,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="severity" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#d32f2f" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Adverse Events Summary
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography color="text.secondary" variant="body2">
                          Total Events
                        </Typography>
                        <Typography variant="h5">
                          {formatNumber(metrics.adverseEvents.total)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography color="text.secondary" variant="body2">
                          Recent Events ({timeRange})
                        </Typography>
                        <Typography variant="h5">
                          {formatNumber(metrics.adverseEvents.recent)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Adverse Events by Severity
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={Object.entries(metrics.adverseEvents.bySeverity).map(
                              ([severity, count]) => ({
                                name: severity,
                                value: count,
                              })
                            )}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.keys(metrics.adverseEvents.bySeverity).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Adverse Events Trend
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer>
                        <LineChart data={metrics.adverseEvents.trend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="week"
                            tickFormatter={(value) => new Date(value).toLocaleDateString()}
                          />
                          <YAxis />
                          <Tooltip
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#ed6c02"
                            strokeWidth={2}
                            name="Events per Week"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Activity Tab */}
          <TabPanel value={currentTab} index={5}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Audit Activity
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography color="text.secondary" variant="body2">
                          Total Actions
                        </Typography>
                        <Typography variant="h5">
                          {formatNumber(metrics.auditActivity.total)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography color="text.secondary" variant="body2">
                          PHI Access Events
                        </Typography>
                        <Typography variant="h5">
                          {formatNumber(metrics.auditActivity.phiAccess)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Actions by Type
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer>
                        <BarChart
                          data={Object.entries(metrics.auditActivity.byAction).map(
                            ([action, count]) => ({
                              action,
                              count,
                            })
                          )}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="action" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#9c27b0" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Top Active Users
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {metrics.auditActivity.topUsers.slice(0, 10).map((user: any, index: number) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 1,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography variant="body2">{user.email}</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {formatNumber(user.count)} actions
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </>
      )}
    </Box>
  );
}