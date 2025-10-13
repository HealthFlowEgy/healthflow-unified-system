// Sprint 3 - Barcode Scanner Screen
// ------------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { useScanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../../theme';
import { prescriptionApi } from '../../services/api';

const ScannerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const devices = useCameraDevices();
  const device = devices.back;

  const [frameProcessor, barcodes] = useScanBarcodes([
    BarcodeFormat.QR_CODE,
    BarcodeFormat.EAN_13,
    BarcodeFormat.CODE_128,
  ], {
    checkInverted: true,
  });

  useEffect(() => {
    checkCameraPermission();
  }, []);

  useEffect(() => {
    if (barcodes && barcodes.length > 0 && !scannedCode && !loading) {
      handleBarcodeScanned(barcodes[0]);
    }
  }, [barcodes]);

  const checkCameraPermission = async () => {
    const cameraPermission = await Camera.requestCameraPermission();
    setHasPermission(cameraPermission === 'authorized');
  };

  const handleBarcodeScanned = async (barcode: any) => {
    const code = barcode.displayValue || barcode.rawValue;
    
    if (!code || code === scannedCode) return;

    setScannedCode(code);
    setIsActive(false);
    Vibration.vibrate(100);

    try {
      setLoading(true);

      // Check if it's a prescription number or medicine barcode
      if (code.startsWith('RX-')) {
        // Prescription QR code
        await handlePrescriptionScan(code);
      } else {
        // Medicine barcode
        await handleMedicineScan(code);
      }
    } catch (error: any) {
      Alert.alert(
        'Scan Error',
        error.response?.data?.error?.message || 'Failed to process scan',
        [
          {
            text: 'Try Again',
            onPress: resetScanner,
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrescriptionScan = async (prescriptionNumber: string) => {
    try {
      const response = await prescriptionApi.search({ prescriptionNumber });
      
      if (response.data.items.length === 0) {
        Alert.alert(
          'Not Found',
          'Prescription not found or already dispensed',
          [{ text: 'OK', onPress: resetScanner }]
        );
        return;
      }

      const prescription = response.data.items[0];
      
      navigation.navigate('DispensingWorkflow', {
        prescriptionId: prescription.id,
      });
    } catch (error) {
      throw error;
    }
  };

  const handleMedicineScan = async (barcode: string) => {
    try {
      const response = await medicineApi.searchByBarcode(barcode);
      
      if (response.data.items.length === 0) {
        Alert.alert(
          'Not Found',
          'Medicine not found in database',
          [{ text: 'OK', onPress: resetScanner }]
        );
        return;
      }

      const medicine = response.data.items[0];
      
      navigation.navigate('MedicineDetail', {
        medicineId: medicine.id,
      });
    } catch (error) {
      throw error;
    }
  };

  const resetScanner = () => {
    setScannedCode(null);
    setIsActive(true);
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Icon name="camera-off" size={64} color={colors.textSecondary} />
          <Text style={styles.permissionText}>
            Camera permission is required to scan codes
          </Text>
          <Button
            mode="contained"
            onPress={checkCameraPermission}
            style={styles.permissionButton}
          >
            Grant Permission
          </Button>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive && !loading}
        frameProcessor={frameProcessor}
        frameProcessorFps={5}
        torch={flashEnabled ? 'on' : 'off'}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.flashButton}
            onPress={toggleFlash}
          >
            <Icon
              name={flashEnabled ? 'flash' : 'flash-off'}
              size={24}
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>

        {/* Scanner Frame */}
        <View style={styles.scannerFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        {/* Instructions */}
        <Surface style={styles.instructions}>
          <Text style={styles.instructionText}>
            {loading
              ? 'Processing...'
              : 'Align QR code or barcode within frame'}
          </Text>
        </Surface>

        {/* Manual Entry Button */}
        <Button
          mode="contained"
          onPress={() => navigation.navigate('ManualEntry')}
          style={styles.manualButton}
          icon="keyboard"
        >
          Enter Manually
        </Button>
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Processing scan...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  permissionText: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  permissionButton: {
    marginTop: spacing.md,
  },
  loadingText: {
    ...typography.body1,
    color: '#ffffff',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingTop: spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    alignSelf: 'center',
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#ffffff',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructions: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    marginBottom: spacing.md,
  },
  instructionText: {
    ...typography.body1,
    color: '#ffffff',
    textAlign: 'center',
  },
  manualButton: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ScannerScreen;

// ------------------------------------------------------------------------------