// File: frontend/regulatory-portal/src/components/pricing/PriceComparison.tsx
// Purpose: Price comparison widget

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material';
import {
  TrendingDown as SavingsIcon,
  LocationOn as LocationIcon,
  LocalShipping as DeliveryIcon,
  Star as StarIcon,
  Notifications as AlertIcon,
  Timeline as HistoryIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../services/api';
import { useTranslation } from 'react-i18next';

interface PriceComparisonProps {
  medicineId: string;
  medicineName: string;
  userLocation?: { lat: number; lng: number };
}

const PriceComparison: React.FC<PriceComparisonProps> = ({
  medicineId,
  medicineName,
  userLocation,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);

  useEffect(() => {
    loadPriceComparison();
  }, [medicineId, filterInStockOnly]);

  const loadPriceComparison = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/v2/prices/compare/${medicineId}`, {
        params: {
          latitude: userLocation?.lat,
          longitude: userLocation?.lng,
          inStockOnly: filterInStockOnly,
        },
      });
      setComparison(response.data.data);
    } catch (error) {
      console.error('Failed to load price comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    try {
      await apiClient.post('/api/v2/prices/alerts', {
        medicineId,
        targetPrice: parseFloat(targetPrice),
      });
      alert(t('prices.alert_created'));
      setShowAlertDialog(false);
      setTargetPrice('');
    } catch (error) {
      alert('Failed to create price alert');
    }
  };

  const formatPrice = (price: number, currency: string = 'EGP') => {
    return `${price.toFixed(2)} ${currency}`;
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return '-';
    return `${distance.toFixed(1)} ${t('prices.km')}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!comparison || comparison.prices.length === 0) {
    return (
      <Alert severity="info">
        {t('prices.no_prices_available')}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                {t('prices.lowest_price')}
              </Typography>
              <Typography variant="h4" color="success.main">
                {formatPrice(comparison.lowestPrice.price)}
              </Typography>
              <Typography variant="body2">
                {comparison.lowestPrice.pharmacyName}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                {t('prices.average_price')}
              </Typography>
              <Typography variant="h4">
                {formatPrice(comparison.averagePrice)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                {t('prices.highest_price')}
              </Typography>
              <Typography variant="h4" color="error.main">
                {formatPrice(comparison.highestPrice.price)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <SavingsIcon color="primary" />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    {t('prices.savings')}
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {formatPrice(comparison.savingsOpportunity)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Actions */}
      <Box display="flex" gap={2} mb={3}>
        <FormControlLabel
          control={
            <Switch
              checked={filterInStockOnly}
              onChange={(e) => setFilterInStockOnly(e.target.checked)}
            />
          }
          label={t('prices.show_in_stock_only')}
        />
        <Button
          variant="outlined"
          startIcon={<AlertIcon />}
          onClick={() => setShowAlertDialog(true)}
        >
          {t('prices.set_alert')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<HistoryIcon />}
          onClick={() => setShowHistory(!showHistory)}
        >
          {t('prices.price_history')}
        </Button>
      </Box>

      {/* Price History Chart */}
      {showHistory && comparison.priceHistory && comparison.priceHistory.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('prices.price_history')} - {t('prices.last_30_days')}
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={comparison.priceHistory}>
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
                    dataKey="price"
                    stroke="#1976d2"
                    strokeWidth={2}
                    name={t('prices.price')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Prices Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('prices.pharmacy')}</TableCell>
              <TableCell>{t('prices.price')}</TableCell>
              <TableCell>{t('prices.distance')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('prices.delivery')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comparison.prices.map((price: any, index: number) => (
              <TableRow
                key={price.pharmacyId}
                sx={{
                  bgcolor: index === 0 ? 'success.lighter' : 'inherit',
                }}
              >
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {price.pharmacyName}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                      <LocationIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {price.pharmacyLocation}
                      </Typography>
                    </Box>
                    {price.rating && (
                      <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                        <StarIcon fontSize="small" sx={{ color: '#ffc107' }} />
                        <Typography variant="caption">
                          {price.rating.toFixed(1)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </TableCell>

                <TableCell>
                  <Typography variant="h6" fontWeight="bold">
                    {formatPrice(price.price, price.currency)}
                  </Typography>
                  {index === 0 && (
                    <Chip
                      label={t('prices.lowest_price')}
                      color="success"
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </TableCell>

                <TableCell>
                  <Typography variant="body2">
                    {formatDistance(price.distance)}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Chip
                    label={price.inStock ? t('prices.in_stock') : t('prices.out_of_stock')}
                    color={price.inStock ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>

                <TableCell>
                  {price.deliveryAvailable ? (
                    <Box>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <DeliveryIcon fontSize="small" color="primary" />
                        <Typography variant="body2">
                          {price.deliveryFee > 0
                            ? formatPrice(price.deliveryFee)
                            : t('prices.free_delivery')}
                        </Typography>
                      </Box>
                      {price.estimatedDeliveryTime && (
                        <Typography variant="caption" color="text.secondary">
                          {price.estimatedDeliveryTime}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>

                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!price.inStock}
                  >
                    {t('common.view')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Price Alert Dialog */}
      <Dialog open={showAlertDialog} onClose={() => setShowAlertDialog(false)}>
        <DialogTitle>
          {t('prices.set_alert')}
          <IconButton
            onClick={() => setShowAlertDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('prices.alert_description')}
          </Typography>
          <TextField
            fullWidth
            label={t('prices.target_price')}
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            InputProps={{
              endAdornment: 'EGP',
            }}
            helperText={`${t('prices.current_lowest_price')}: ${formatPrice(comparison.lowestPrice.price)}`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAlertDialog(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateAlert}
            disabled={!targetPrice || parseFloat(targetPrice) <= 0}
          >
            {t('prices.set_alert')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PriceComparison;